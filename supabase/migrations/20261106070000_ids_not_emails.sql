-- "Who's going" and plan answers now use an anonymous account id instead of an email,
-- so nobody can read another mom's email address from those tables.

-- 1) event_going
alter table public.event_going add column if not exists member_id uuid;
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='event_going' and column_name='member_email') then
    update public.event_going g set member_id = u.id
      from auth.users u where lower(u.email) = g.member_email and g.member_id is null;
    delete from public.event_going where member_id is null;
  end if;
end $$;

drop policy if exists "see yeses and my own" on public.event_going;
drop policy if exists "add my own answer" on public.event_going;
drop policy if exists "change my own answer" on public.event_going;
drop policy if exists "remove my own answer" on public.event_going;
alter table public.event_going drop constraint if exists event_going_pkey;
alter table public.event_going drop column if exists member_email;
alter table public.event_going alter column member_id set not null;
alter table public.event_going add primary key (event_id, member_id);

create policy "see yeses and my own" on public.event_going
  for select to authenticated using (public.is_member() and (going or member_id = auth.uid()));
create policy "add my own answer" on public.event_going
  for insert to authenticated with check (public.is_member() and member_id = auth.uid());
create policy "change my own answer" on public.event_going
  for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "remove my own answer" on public.event_going
  for delete to authenticated using (member_id = auth.uid());

-- 2) plan_responses
alter table public.plan_responses add column if not exists member_id uuid;
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='plan_responses' and column_name='member_email') then
    update public.plan_responses r set member_id = u.id
      from auth.users u where lower(u.email) = r.member_email and r.member_id is null;
    delete from public.plan_responses where member_id is null;
  end if;
end $$;

drop policy if exists "members read plan responses" on public.plan_responses;
drop policy if exists "add my plan response" on public.plan_responses;
drop policy if exists "change my plan response" on public.plan_responses;
drop policy if exists "remove my plan response" on public.plan_responses;
alter table public.plan_responses drop constraint if exists plan_responses_pkey;
alter table public.plan_responses drop column if exists member_email;
alter table public.plan_responses alter column member_id set not null;
alter table public.plan_responses add primary key (plan_id, member_id);

create policy "members read plan responses" on public.plan_responses
  for select to authenticated using (public.is_member());
create policy "add my plan response" on public.plan_responses
  for insert to authenticated with check (public.is_member() and member_id = auth.uid());
create policy "change my plan response" on public.plan_responses
  for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "remove my plan response" on public.plan_responses
  for delete to authenticated using (member_id = auth.uid());
