-- ==========================================================================
-- 0013_block_create_space_with_pending_invite.sql
--
-- באג אמיתי שקרה בפרודקשן (24.9): בן/בת הזוג לחצו על קישור ההזמנה האמיתי,
-- אבל ניסיון הכניסה הראשון נכשל (exchangeCodeForSession נכשל, /auth/callback
-- הפנה ל-/login?error=link_expired), מה שכפה ניסיון כניסה שני — ובין שני
-- הניסיונות ה-cookie הזמני של ההזמנה (tbl_invite, 30 דק') כבר לא נקרא בהצלחה
-- ב-/auth/callback (peekInviteCookie החזיר null), אז הניתוב נפל ל-/onboarding
-- והמשתמש/ת יצרו מרחב חדש במקום להצטרף לקיים. הוכח בלוגים (Supabase auth_logs
-- + Vercel runtime logs): GET /auth/callback הראשון -> 307 ל-/login;
-- GET /auth/callback השני -> 307 ל-/onboarding (לא ל-/invite/continue).
--
-- ה-cookie הזמני הוא מנגנון ניתוב נוח, אבל לא אמין מספיק כדי להיות רשת
-- הביטחון היחידה נגד "שני מרחבים לאותו זוג". התיקון האמיתי הוא ברמת ה-DB,
-- בתוך create_space עצמה, אטומי עם הבדיקות הקיימות (ALREADY_IN_SPACE וכו'):
-- אם יש הזמנה pending שלא פגה שממוענת לאימייל המאומת של הקורא — אסור ליצור
-- מרחב חדש, לא משנה איזה נתיב/cookie/ניתוב הוביל לכאן.
-- ==========================================================================

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
  v_email text;
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

  -- הגנה בעומק (ראו הערת המיגרציה למעלה): גם אם ניתוב ההזמנה נכשל איכשהו,
  -- אסור לתת למשתמש עם הזמנה ממתינה ליצור מרחב נפרד במקום להצטרף לקיים.
  select lower(btrim(email)) into v_email from auth.users
    where id = p_actor and email_confirmed_at is not null;
  if v_email is not null and exists (
    select 1 from private.invitations
    where target_email = v_email and status = 'pending' and expires_at > clock_timestamp()
  ) then
    raise exception 'PENDING_INVITATION_EXISTS';
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

-- has_pending_invitation_for_me — קריאה בלבד, גרנטד ל-authenticated (כמו
-- get_invitation_status), auth.uid()/email פנימי. משמש את /onboarding כדי
-- להראות הודעה ברורה *לפני* שהמשתמש בכלל ממלא טופס, במקום לתת לו ליפול
-- על השגיאה מ-create_space אחרי מילוי השם.
create or replace function public.has_pending_invitation_for_me()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
begin
  select lower(btrim(email)) into v_email from auth.users
    where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then return false; end if;
  return exists (
    select 1 from private.invitations
    where target_email = v_email and status = 'pending' and expires_at > clock_timestamp()
  );
end;
$$;
revoke all on function public.has_pending_invitation_for_me() from public, anon;
grant execute on function public.has_pending_invitation_for_me() to authenticated;
