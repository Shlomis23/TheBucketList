-- ==========================================================================
-- 0014_get_idea_reactions_rpc.sql
--
-- שלומי אישר במפורש (24.9) לשנות עיצוב פרטיות מקורי: להציג בכרטיס רעיון
-- את התגובה של שני הצדדים, לא רק "התגובה שלי". own_reaction_read (0002)
-- ממשיכה לחסום קריאת idea_reactions של האחר ישירות מהלקוח — זה עדיין
-- הבסיס הנכון; הדרך הבטוחה לחשוף את שתי התגובות היא RPC יעודית, בדיוק
-- כמו list_my_matches (0002) שכבר חושפת רק isMatch בלי לתת גישה גולמית
-- לטבלה. RPC זו קוראת ל-security definer ולכן חייבת לבדוק חברות בעצמה
-- (private.is_member) — לא לסמוך על RLS.
-- ==========================================================================

create or replace function public.get_idea_reactions(p_idea_id uuid)
returns table (user_id uuid, display_name text, preference text)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, p.display_name, r.preference
  from public.ideas i
  join public.space_members m on m.space_id = i.space_id
  join public.profiles p on p.id = m.user_id
  left join public.idea_reactions r on r.idea_id = i.id and r.user_id = m.user_id
  where i.id = p_idea_id and private.is_member(i.space_id)
  order by m.slot;
$$;
revoke all on function public.get_idea_reactions(uuid) from public, anon, authenticated;
grant execute on function public.get_idea_reactions(uuid) to authenticated;
