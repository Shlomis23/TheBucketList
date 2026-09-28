-- Transactional integration checks. All fixtures and changes are rolled back.
begin;
create temporary table recipe_test_ids(a uuid,b uuid,c uuid,s1 uuid,s2 uuid,r uuid);
insert into recipe_test_ids select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
insert into auth.users(id,email,aud,role) select u, u::text||'@recipe-test.invalid','authenticated','authenticated' from recipe_test_ids cross join lateral unnest(array[a,b,c]) u;
insert into public.profiles(id,display_name) select u,'Recipe test' from recipe_test_ids cross join lateral unnest(array[a,b,c]) u;
insert into public.spaces(id,status,timezone) select s,'open','Asia/Jerusalem' from recipe_test_ids cross join lateral unnest(array[s1,s2]) s;
insert into public.space_members(space_id,user_id,slot) select s1,a,1 from recipe_test_ids union all select s1,b,2 from recipe_test_ids union all select s2,c,1 from recipe_test_ids;
grant select on recipe_test_ids to service_role,authenticated;
set local role service_role;
do $$
declare t record; r1 public.recipes; r2 public.recipes; rejected boolean;
begin
 select * into t from recipe_test_ids;
 r1:=public.save_recipe(t.a,t.r,null,'סלט',null,'מלפפון','פחות מלח');
 r2:=public.save_recipe(t.a,t.r,null,'סלט',null,'מלפפון','פחות מלח');
 if r1.id<>r2.id or (select count(*) from public.recipes where space_id=t.s1)<>1 then raise exception 'duplicate retry'; end if;
 r2:=public.save_recipe(t.b,t.r,1,'סלט מעודכן','https://example.com','מלפפון ועגבנייה','פחות מלח');
 if r2.version<>2 then raise exception 'partner update'; end if;
 rejected:=false;begin perform public.save_recipe(t.a,t.r,1,'ישן',null,'','');exception when others then rejected:=sqlerrm='VERSION_CONFLICT';end;
 if not rejected then raise exception 'stale update allowed';end if;
 rejected:=false;begin perform public.save_recipe(t.c,t.r,2,'זר',null,'','');exception when others then rejected:=sqlerrm='NOT_FOUND';end;
 if not rejected then raise exception 'foreign update allowed';end if;
 rejected:=false;begin perform public.delete_recipe(t.c,t.r,2);exception when others then rejected:=sqlerrm='NOT_FOUND';end;
 if not rejected then raise exception 'foreign delete allowed';end if;
 rejected:=false;begin perform public.delete_recipe(t.a,t.r,1);exception when others then rejected:=sqlerrm='VERSION_CONFLICT';end;
 if not rejected then raise exception 'stale delete allowed';end if;
 rejected:=false;begin perform public.save_recipe(null,gen_random_uuid(),null,'ללא משתמש',null,'','');exception when others then rejected:=sqlerrm='NOT_MEMBER';end;
 if not rejected then raise exception 'null actor allowed';end if;
 if jsonb_array_length(public.export_space_data(t.b)->'recipes')<>1 then raise exception 'backup missing recipe';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select a::text from recipe_test_ids),true);
set local role authenticated;
do $$begin if (select count(*) from public.recipes)<>1 then raise exception 'member read failed';end if; end $$;
reset role;
select set_config('request.jwt.claim.sub',(select c::text from recipe_test_ids),true);
set local role authenticated;
do $$begin
 if (select count(*) from public.recipes)<>0 then raise exception 'foreign read allowed';end if;
 if has_table_privilege(current_user,'public.recipes','INSERT') or has_function_privilege(current_user,'public.save_recipe(uuid,uuid,integer,text,text,text,text)','EXECUTE') then raise exception 'client write grants';end if;
end $$;
reset role;
update public.spaces set status='closed',closed_at=now(),purge_after=now()+interval '14 days' where id=(select s1 from recipe_test_ids);
select set_config('request.jwt.claim.sub',(select a::text from recipe_test_ids),true);
set local role authenticated;
do $$begin if (select count(*) from public.recipes)<>0 then raise exception 'closed read allowed';end if;end $$;
reset role;
set local role service_role;
do $$declare t record; rejected boolean:=false;begin
 select * into t from recipe_test_ids;
 begin perform public.save_recipe(t.a,t.r,2,'סגור',null,'','');exception when others then rejected:=sqlerrm='NOT_MEMBER';end;
 if not rejected then raise exception 'closed write allowed';end if;
end $$;
reset role;
update public.spaces set status='open',closed_at=null,purge_after=null where id=(select s1 from recipe_test_ids);
set local role service_role;
do $$declare t record;begin
 select * into t from recipe_test_ids;
 perform public.delete_recipe(t.b,t.r,2);
 if exists(select 1 from public.recipes where id=t.r) then raise exception 'partner delete failed';end if;
end $$;
reset role;
do $$begin
 if has_table_privilege('anon','public.recipes','SELECT') or has_function_privilege('anon','public.delete_recipe(uuid,uuid,integer)','EXECUTE') then raise exception 'anon grants';end if;
end $$;
select 'PASS: create, retry, partner edit/delete, conflict, foreign/closed access, RLS, grants, backup' as result;
rollback;

