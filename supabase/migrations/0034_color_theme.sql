-- 0034: ערכת צבע אישית (26.9) — כל אחד בוחר לעצמו בהגדרות. נשמר בפרופיל כדי
-- שיעבור בין מכשירים; העוגייה bl-color רק מונעת הבזק בטעינה (lib/themes.ts).
alter table public.profiles
  add column color_theme text not null default 'purple'
  check (color_theme in ('purple', 'ocean', 'turquoise', 'mango'));

create or replace function public.set_color_theme(p_actor uuid, p_theme text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if p_theme not in ('purple', 'ocean', 'turquoise', 'mango') then
    raise exception 'INVALID_INPUT';
  end if;
  update public.profiles set color_theme = p_theme where id = p_actor;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  return p_theme;
end;
$$;

revoke all on function public.set_color_theme(uuid, text) from public, anon, authenticated;
grant execute on function public.set_color_theme(uuid, text) to service_role;
