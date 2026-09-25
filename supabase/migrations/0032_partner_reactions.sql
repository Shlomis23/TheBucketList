-- 0032: מצב הרעיון ברשימה (26.9, אפשרות א) — "מחכה לך", "מחכה לגואל",
-- "גואל: אולי". צריך את התגובות של בן/בת הזוג לכל הרעיונות בבת אחת.
-- התגובות גלויות לשניכם ממילא (החלטה 24.9, get_idea_reactions), כאן רק
-- ברשימה אחת. RLS (own_reaction_read) לא מחזיר אותן ללקוח — לכן service_role.
create or replace function public.partner_reactions(p_actor uuid)
returns table (idea_id uuid, preference text)
language sql stable security definer set search_path = ''
as $$
  select r.idea_id, r.preference
    from public.space_members me
    join public.spaces s on s.id = me.space_id and s.status = 'open'
    join public.idea_reactions r on r.space_id = me.space_id and r.user_id <> p_actor
   where me.user_id = p_actor;
$$;

revoke all on function public.partner_reactions(uuid) from public, anon, authenticated;
grant execute on function public.partner_reactions(uuid) to service_role;
