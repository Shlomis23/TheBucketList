-- ==========================================================================
-- 0006_profile_and_space_rpcs.sql
--
-- RPC שירות ראשונות לזרימה האנכית הראשונה (F1, spec סעיף 5, 13.2):
-- updateMyProfile, createSpace. שתיהן service_role בלבד — p_actor מגיע
-- מהשרת (getVerifiedUserId אחרי session מאומת), לא מהטופס של הלקוח.
-- רץ בפועל על wnsaynkcjpxpibywywal ונבדק מול get_advisors — אין ממצא חדש.
-- ==========================================================================

create or replace function public.update_my_profile(p_actor uuid, p_display_name text)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := btrim(p_display_name);
  v_profile public.profiles%rowtype;
begin
  if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'INVALID_INPUT';
  end if;
  insert into public.profiles (id, display_name) values (p_actor, v_name)
  on conflict (id) do update set display_name = excluded.display_name
  returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.update_my_profile(uuid,text) from public, anon, authenticated;
grant execute on function public.update_my_profile(uuid,text) to service_role;

create or replace function public.create_space(
  p_actor uuid, p_request_id uuid, p_timezone text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text := md5(coalesce(p_timezone,''));
begin
  if not exists (select 1 from public.profiles where id = p_actor) then
    raise exception 'INVALID_INPUT';
  end if;

  -- idempotency: אותו request_id + payload זהה מחזיר את אותה תוצאה;
  -- אותו request_id + payload שונה הוא 409.
  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'create_space' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      return v_existing_resource;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  -- unique(user_id) על space_members הוא רשת הביטחון האמיתית נגד מירוץ;
  -- הבדיקה כאן רק נותנת שגיאה ברורה מוקדם יותר בנתיב הרגיל (לא-מרוצה).
  if exists (select 1 from public.space_members where user_id = p_actor) then
    raise exception 'ALREADY_IN_SPACE';
  end if;

  insert into public.spaces (timezone)
    values (coalesce(nullif(btrim(p_timezone), ''), 'Asia/Jerusalem'))
    returning id into v_space;
  insert into public.space_members (space_id, user_id, slot) values (v_space, p_actor, 1);
  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_space', p_request_id, v_payload_hash, v_space);
  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space, p_actor, 'space.created');
  return v_space;
end;
$$;
revoke all on function public.create_space(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.create_space(uuid,uuid,text) to service_role;
