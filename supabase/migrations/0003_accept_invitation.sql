-- ==========================================================================
-- 0003_accept_invitation.sql
--
-- מקור: docs/The-Bucket-List-Technical-Spec-HE.md סעיף 10.3.
-- זו הדוגמה הקונקרטית היחידה ל-RPC כתיבה שכבר מפורטת באפיון עד רמת מימוש.
-- שאר ה-RPC בטבלה שבסעיף 13.2 (createSpace, createIdea, setReaction וכו')
-- עדיין לא נכתבו — זו עבודה לשלבים 1–4, לא רק "להעתיק את הדפוס הזה".
-- ==========================================================================

-- השרת מאמת משתמש, מחשב SHA-256 של token אקראי ומעביר רק את user ID
-- מה-session המאומת ואת ה-hash. אין endpoint המקבל p_actor מהדפדפן.
create or replace function public.accept_invitation_internal(
  p_actor uuid, p_token_hash text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_existing uuid;
  v_status text;
  v_email text;
  v_inv private.invitations%rowtype;
begin
  select lower(btrim(email)) into v_email from auth.users
    where id = p_actor and email_confirmed_at is not null;
  if v_email is null then raise exception 'INVITE_UNAVAILABLE'; end if;

  select space_id into v_space from private.invitations where token_hash = p_token_hash;
  if v_space is null then raise exception 'INVITE_UNAVAILABLE'; end if;

  -- סדר נעילות זהה להנפקה, ביטול וסגירת מרחב.
  select status into v_status from public.spaces where id = v_space for update;
  if v_status is distinct from 'open' then raise exception 'INVITE_UNAVAILABLE'; end if;
  select * into v_inv from private.invitations where token_hash = p_token_hash for update;
  if not found then raise exception 'INVITE_UNAVAILABLE'; end if;
  if v_inv.target_email <> v_email then raise exception 'INVITE_UNAVAILABLE'; end if;

  select space_id into v_existing from public.space_members where user_id = p_actor;
  if v_inv.status = 'accepted' and v_inv.accepted_by = p_actor
     and v_existing = v_space then
    return v_space;
  end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= clock_timestamp()
     or v_inv.created_by = p_actor then raise exception 'INVITE_UNAVAILABLE'; end if;
  if v_existing is not null then raise exception 'ALREADY_IN_SPACE'; end if;
  if (select count(*) from public.space_members where space_id = v_space) <> 1 then
    raise exception 'INVITE_UNAVAILABLE';
  end if;
  if not exists (select 1 from public.space_members
      where space_id = v_space and user_id = v_inv.created_by and slot = 1) then
    raise exception 'INVITE_UNAVAILABLE';
  end if;

  insert into public.space_members(space_id,user_id,slot) values (v_space,p_actor,2);
  update private.invitations set status = 'accepted', accepted_by = p_actor,
    accepted_at = now() where id = v_inv.id;
  insert into private.audit_events(space_id,actor_id,event_type)
    values (v_space,p_actor,'invitation.accepted');
  return v_space;
end;
$$;
revoke all on function public.accept_invitation_internal(uuid,text)
  from public, anon, authenticated;
grant execute on function public.accept_invitation_internal(uuid,text) to service_role;

-- יש ליצור profile לפני הקבלה. unique violation עקב שתי הזמנות למרחבים
-- שונים לאותו משתמש ממופה ל-409 כללי בשכבת ה-DAL; הטרנזקציה כולה מתבטלת.
-- תוקף ההזמנה המוצע הוא 48 שעות — החלטת מוצר, לא תאריך אירוע אמיתי.
