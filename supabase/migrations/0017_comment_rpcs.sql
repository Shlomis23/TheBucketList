-- ==========================================================================
-- 0017_comment_rpcs.sql
--
-- תגובות טקסט על רעיון — spec סעיף 6.1 ("1–1,000 תווים; גלויה לשניהם; רק
-- המחבר עורך/מוחק. אין HTML/Markdown עשיר"), 13.2 (addComment/editComment/
-- deleteComment), טבלת הרשאות סעיף 11 ("קורא ומוסיף; עורך ומוחק את שלו").
-- שלומי אישר לבנות (25.9).
--
-- קריאה: כבר קיימת — member_read על idea_comments (0002). כאן רק כתיבה,
-- בדפוס הקיים: RPC שירות (service_role בלבד), p_actor מהשרת (לעולם לא
-- מהטופס), בדיקת חברות + מרחב פתוח בתוך הפונקציה.
--   add_comment    — idempotent דרך private.mutation_keys (כמו create_idea):
--                    לחיצה כפולה/retry עם אותו request_id לא יוצרת כפילות.
--                    רק על רעיון פעיל (בארכיון: קריאה בלבד, כמו תגובות רצון).
--   edit_comment   — המחבר בלבד, expectedVersion (אין דריסה שקטה).
--   delete_comment — המחבר בלבד, expectedVersion (לא מוחקים גרסה שלא ראית).
-- הודעה של הצד השני מחזירה NOT_AUTHOR, ורעיון/תגובה של מרחב זר — NOT_FOUND
-- זהה ל"לא קיים" (אין דליפת קיום).
-- ==========================================================================

create or replace function public.add_comment(
  p_actor uuid,
  p_request_id uuid,
  p_idea_id uuid,
  p_body text
) returns public.idea_comments
language plpgsql security definer set search_path = ''
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_idea public.ideas%rowtype;
  v_comment public.idea_comments%rowtype;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text;
begin
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'INVALID_INPUT';
  end if;
  v_payload_hash := md5(coalesce(p_idea_id::text, '') || '|' || v_body);

  select i.* into v_idea
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_idea_id and m.user_id = p_actor and s.status = 'open';
  if v_idea.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_idea.status <> 'active' then
    raise exception 'IDEA_ARCHIVED';
  end if;

  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'add_comment' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      select * into v_comment from public.idea_comments where id = v_existing_resource;
      return v_comment;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  insert into public.idea_comments (space_id, idea_id, created_by, body)
    values (v_idea.space_id, v_idea.id, p_actor, v_body)
    returning * into v_comment;

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'add_comment', p_request_id, v_payload_hash, v_comment.id);

  return v_comment;
end;
$$;

create or replace function public.edit_comment(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer,
  p_body text
) returns public.idea_comments
language plpgsql security definer set search_path = ''
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_comment public.idea_comments%rowtype;
begin
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'INVALID_INPUT';
  end if;

  select c.* into v_comment
    from public.idea_comments c
    join public.space_members m on m.space_id = c.space_id
    join public.spaces s on s.id = c.space_id
    where c.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of c;
  if v_comment.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_comment.created_by <> p_actor then
    raise exception 'NOT_AUTHOR';
  end if;
  if v_comment.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.idea_comments
    set body = v_body, version = version + 1, updated_at = now()
    where id = p_id
    returning * into v_comment;

  return v_comment;
end;
$$;

create or replace function public.delete_comment(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment public.idea_comments%rowtype;
begin
  select c.* into v_comment
    from public.idea_comments c
    join public.space_members m on m.space_id = c.space_id
    join public.spaces s on s.id = c.space_id
    where c.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of c;
  if v_comment.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_comment.created_by <> p_actor then
    raise exception 'NOT_AUTHOR';
  end if;
  if v_comment.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  delete from public.idea_comments where id = p_id;
  return true;
end;
$$;

revoke all on function public.add_comment(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.edit_comment(uuid,uuid,integer,text) from public, anon, authenticated;
revoke all on function public.delete_comment(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.add_comment(uuid,uuid,uuid,text) to service_role;
grant execute on function public.edit_comment(uuid,uuid,integer,text) to service_role;
grant execute on function public.delete_comment(uuid,uuid,integer) to service_role;
