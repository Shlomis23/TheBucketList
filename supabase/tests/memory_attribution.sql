-- Synthetic fixtures only. The entire transaction is rolled back, including auth users.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid();
  mem public.memories; edited public.memories; linked public.memories;
  idea public.ideas; plan_id uuid; mem_id uuid;
  before_edit timestamptz := now();
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@memory-test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@memory-test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@memory-test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (id, display_name) values (a, 'Creator'), (b, 'Editor'), (c, 'Outsider');
  insert into public.spaces (id, status, timezone) values
    (s1, 'open', 'Asia/Jerusalem'), (s2, 'open', 'Asia/Jerusalem');
  insert into public.space_members (space_id, user_id, slot) values (s1, a, 1), (s1, b, 2), (s2, c, 1);

  mem := public.create_memory(a, gen_random_uuid(), 'Original', current_date - 1, 'Story', null);
  if mem.last_edited_by is not null or mem.last_edited_at is not null then
    raise exception 'New memory has a fabricated editor';
  end if;
  -- Simulate an old memory with past edits whose actors were never recorded.
  update public.memories set version = 3, updated_at = now() - interval '1 day' where id = mem.id;
  select * into mem from public.memories where id = mem.id;
  if mem.last_edited_by is not null or mem.last_edited_at is not null then
    raise exception 'Historical editor was guessed';
  end if;
  edited := public.update_memory(b, mem.id, 3, mem.happened_on, 'Partner edit', mem.title, mem.category);
  if edited.created_by <> a or edited.last_edited_by is distinct from b
     or edited.last_edited_at is null or edited.last_edited_at < before_edit or edited.version <> 4 then
    raise exception 'Partner edit attribution is incorrect';
  end if;
  if private.home_memory_card(mem.id)->>'lastEditedByName' is distinct from 'Editor'
     or private.home_memory_card(mem.id)->>'createdByName' is distinct from 'Creator' then
    raise exception 'Home DTO attribution is incorrect';
  end if;

  begin
    perform public.update_memory(a, mem.id, 3, mem.happened_on, 'Stale', mem.title, null);
    raise exception 'Stale edit accepted';
  exception when others then
    if sqlerrm not like '%VERSION_CONFLICT%' then raise; end if;
  end;
  begin
    perform public.update_memory(c, mem.id, 4, mem.happened_on, 'Outsider', mem.title, null);
    raise exception 'Outsider edit accepted';
  exception when others then
    if sqlerrm not like '%NOT_FOUND%' then raise; end if;
  end;
  begin
    perform public.update_memory(a, mem.id, 4, mem.happened_on, 'Invalid', '', null);
    raise exception 'Invalid edit accepted';
  exception when others then
    if sqlerrm not like '%INVALID_INPUT%' then raise; end if;
  end;
  select * into edited from public.memories where id = mem.id;
  if edited.last_edited_by is distinct from b or edited.version <> 4 or edited.story <> 'Partner edit' then
    raise exception 'Rejected write changed content or attribution';
  end if;
  edited := public.update_memory(a, mem.id, 4, mem.happened_on, edited.story, 'New title', 'other');
  if edited.last_edited_by is distinct from a or edited.created_by <> a or edited.title <> 'New title' then
    raise exception 'Next editor did not replace last editor';
  end if;

  -- Plan-backed memories follow the same edit path.
  idea := public.create_idea(a, gen_random_uuid(), 'Idea', '', 'other', null, null, null, null, null, true);
  plan_id := (public.create_plan(a, gen_random_uuid(), idea.id, now() - interval '2 days', null, 'Asia/Jerusalem', null, '', null)).id;
  mem_id := public.complete_plan(a, gen_random_uuid(), plan_id, 1, current_date - 1, 'Plan story');
  select * into linked from public.memories where id = mem_id;
  edited := public.update_memory(b, linked.id, linked.version, linked.happened_on, 'Edited plan story', linked.title, linked.category);
  if edited.last_edited_by is distinct from b or edited.created_by <> a or edited.plan_id <> plan_id then
    raise exception 'Plan memory attribution is incorrect';
  end if;
  if to_regprocedure('public.update_memory(uuid,uuid,integer,date,text)') is not null then
    execute 'select * from public.update_memory($1,$2,$3,$4,$5)'
      into edited using a, edited.id, edited.version, edited.happened_on, 'Legacy edit';
    if edited.last_edited_by is distinct from a then raise exception 'Legacy edit not tracked'; end if;
  end if;

  update public.spaces set status = 'closed', closed_at = now(), purge_after = now() + interval '30 days' where id = s1;
  begin
    perform public.update_memory(b, mem.id, 5, mem.happened_on, 'Closed', 'New title', 'other');
    raise exception 'Closed space edit accepted';
  exception when others then
    if sqlerrm not like '%NOT_FOUND%' then raise; end if;
  end;
  if has_function_privilege('anon', 'public.update_memory(uuid,uuid,integer,date,text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.update_memory(uuid,uuid,integer,date,text,text,text)', 'execute') then
    raise exception 'Service RPC exposed to client roles';
  end if;
end;
$$;
select 'PASS: creation, legacy data, partner edits, creator preservation, DTO, stale/invalid/outsider/closed rejection, plan memories, legacy RPC and grants' as result;
rollback;
