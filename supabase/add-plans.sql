-- =====================================================================
-- Morley Moms: "Who's going" on events + the Plans tab.
-- Run once in Supabase -> SQL Editor. Safe to run again.
-- =====================================================================

-- 1) Events can ask "who's going?"
alter table public.events add column if not exists ask_going boolean not null default false;

-- One answer per mom per event. Only YES answers are visible to other moms;
-- a "can't" is only ever visible to the mom who gave it.
create table if not exists public.event_going (
  event_id     uuid not null references public.events(id) on delete cascade,
  member_email text not null check (member_email = lower(member_email)),
  member_name  text,
  going        boolean not null,
  created_at   timestamptz not null default now(),
  primary key (event_id, member_email)
);
alter table public.event_going enable row level security;
revoke all on public.event_going from anon;

drop policy if exists "see yeses and my own" on public.event_going;
create policy "see yeses and my own" on public.event_going
  for select to authenticated
  using (public.is_member() and (going or member_email = lower(coalesce(auth.jwt() ->> 'email', ''))));

drop policy if exists "add my own answer" on public.event_going;
create policy "add my own answer" on public.event_going
  for insert to authenticated
  with check (public.is_member() and member_email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "change my own answer" on public.event_going;
create policy "change my own answer" on public.event_going
  for update to authenticated
  using (member_email = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (member_email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "remove my own answer" on public.event_going;
create policy "remove my own answer" on public.event_going
  for delete to authenticated
  using (member_email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 2) Plans: things the group is considering (LEAD, YMCA Winter Academy...)
create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 120),
  details         text check (char_length(details) <= 2000),
  link            text check (char_length(link) <= 500),
  plan_date       date,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);
drop trigger if exists plans_author on public.plans;
create trigger plans_author before insert on public.plans
  for each row execute function public.set_author();

alter table public.plans enable row level security;
revoke all on public.plans from anon;

drop policy if exists "members read plans" on public.plans;
create policy "members read plans" on public.plans
  for select to authenticated using (public.is_member());
drop policy if exists "members add plans" on public.plans;
create policy "members add plans" on public.plans
  for insert to authenticated with check (public.is_member());
drop policy if exists "members edit plans" on public.plans;
create policy "members edit plans" on public.plans
  for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists "owner or admin deletes plans" on public.plans;
create policy "owner or admin deletes plans" on public.plans
  for delete to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()));

-- Each mom's status on a plan: interested, or signed up. No row = no answer.
create table if not exists public.plan_responses (
  plan_id      uuid not null references public.plans(id) on delete cascade,
  member_email text not null check (member_email = lower(member_email)),
  member_name  text,
  status       text not null check (status in ('interested','signed_up')),
  created_at   timestamptz not null default now(),
  primary key (plan_id, member_email)
);
alter table public.plan_responses enable row level security;
revoke all on public.plan_responses from anon;

drop policy if exists "members read plan responses" on public.plan_responses;
create policy "members read plan responses" on public.plan_responses
  for select to authenticated using (public.is_member());
drop policy if exists "add my plan response" on public.plan_responses;
create policy "add my plan response" on public.plan_responses
  for insert to authenticated
  with check (public.is_member() and member_email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "change my plan response" on public.plan_responses;
create policy "change my plan response" on public.plan_responses
  for update to authenticated
  using (member_email = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (member_email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "remove my plan response" on public.plan_responses;
create policy "remove my plan response" on public.plan_responses
  for delete to authenticated
  using (member_email = lower(coalesce(auth.jwt() ->> 'email', '')));
