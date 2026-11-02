-- =====================================================================
-- Morley Moms — database setup
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run again later; it won't duplicate anything.
--
-- How the lock works:
--   * Every table has Row Level Security ON.
--   * Rows are only returned to someone who is signed in AND whose email
--     is in the `members` table. Everyone else gets nothing, even with
--     the public key from config.js.
-- =====================================================================

-- ---------- Members (the approved list) ----------
create table if not exists public.members (
  email        text primary key check (email = lower(email)),
  display_name text,
  is_admin     boolean not null default false,
  added_at     timestamptz not null default now()
);

-- Is the signed-in person on the list?
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Is the signed-in person an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where email = lower(coalesce(auth.jwt() ->> 'email', '')) and is_admin
  );
$$;

-- Fills in who posted something, so nobody can post as someone else.
create or replace function public.set_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Posts from the app are stamped with the signed-in member.
  -- Rows loaded by the admin in the SQL editor keep the name they were given.
  if auth.uid() is not null then
    new.created_by := auth.uid();
    select coalesce(display_name, split_part(email, '@', 1))
      into new.created_by_name
      from public.members
     where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  end if;
  return new;
end;
$$;

-- ---------- Events ----------
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 120),
  category        text not null default 'school'
                  check (category in ('pto','school','volunteer','social','kids')),
  starts_at       timestamptz not null,
  all_day         boolean not null default false,
  location        text check (char_length(location) <= 200),
  pickup_dropoff  text check (char_length(pickup_dropoff) <= 300),
  details         text check (char_length(details) <= 2000),
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);
create index if not exists events_starts_at_idx on public.events (starts_at);

-- v4: end times, multi-day ranges, weekly repeats, and two more types
--   ends_at       end time (or, for all-day items, the last day)
--   repeat_days   e.g. {tue} or {wed,thu} for "every Wednesday and Thursday"
--   repeat_until  last date a weekly item happens (skips no-school days)
alter table public.events add column if not exists ends_at timestamptz;
alter table public.events add column if not exists repeat_days text[];
alter table public.events add column if not exists repeat_until date;
alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check
  check (category in ('pto','school','noschool','volunteer','social','kids','rides'));
alter table public.events drop constraint if exists events_repeat_days_check;
alter table public.events add constraint events_repeat_days_check
  check (repeat_days is null or repeat_days <@ array['mon','tue','wed','thu','fri','sat','sun']);

-- ---------- Spelling lists ----------
create table if not exists public.spelling_lists (
  id              uuid primary key default gen_random_uuid(),
  week_of         date not null,
  title           text check (char_length(title) <= 120),
  words           text[] not null default '{}',
  notes           text check (char_length(notes) <= 1000),
  photo_path      text,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);
create index if not exists spelling_week_idx on public.spelling_lists (week_of desc);

-- v2: the test day (it moves around) and separate challenge words
alter table public.spelling_lists add column if not exists test_date date;
alter table public.spelling_lists add column if not exists challenge_words text[] not null default '{}';
create index if not exists spelling_test_idx on public.spelling_lists (test_date desc);

drop trigger if exists events_author on public.events;
create trigger events_author before insert on public.events
  for each row execute function public.set_author();

drop trigger if exists spelling_author on public.spelling_lists;
create trigger spelling_author before insert on public.spelling_lists
  for each row execute function public.set_author();

-- ---------- Turn the locks on ----------
alter table public.members        enable row level security;
alter table public.events         enable row level security;
alter table public.spelling_lists enable row level security;

-- Signed-out visitors get no access at all (belt and suspenders).
revoke all on public.members, public.events, public.spelling_lists from anon;

-- Members table: members can see the list; only admins can change it.
drop policy if exists "members can view members" on public.members;
create policy "members can view members" on public.members
  for select to authenticated using (public.is_member());

drop policy if exists "admins manage members" on public.members;
create policy "admins manage members" on public.members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Events: any member can read and post; poster or admin can edit/delete.
drop policy if exists "members read events" on public.events;
create policy "members read events" on public.events
  for select to authenticated using (public.is_member());

drop policy if exists "members add events" on public.events;
create policy "members add events" on public.events
  for insert to authenticated with check (public.is_member());

drop policy if exists "owner or admin edits events" on public.events;
create policy "owner or admin edits events" on public.events
  for update to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_member());

drop policy if exists "owner or admin deletes events" on public.events;
create policy "owner or admin deletes events" on public.events
  for delete to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()));

-- Spelling lists: same rules.
drop policy if exists "members read spelling" on public.spelling_lists;
create policy "members read spelling" on public.spelling_lists
  for select to authenticated using (public.is_member());

drop policy if exists "members add spelling" on public.spelling_lists;
create policy "members add spelling" on public.spelling_lists
  for insert to authenticated with check (public.is_member());

drop policy if exists "owner or admin edits spelling" on public.spelling_lists;
create policy "owner or admin edits spelling" on public.spelling_lists
  for update to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_member());

drop policy if exists "owner or admin deletes spelling" on public.spelling_lists;
create policy "owner or admin deletes spelling" on public.spelling_lists
  for delete to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()));

-- ---------- Classrooms & specials ----------
-- One row per classroom. schedule maps rotation day number to its special:
--   {"1":["Art"],"2":["Gym"],"3":["Music"],"4":["Library"]}
create table if not exists public.classrooms (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 60),
  schedule        jsonb not null default '{}'::jsonb,
  notes           text check (char_length(notes) <= 500),
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists classrooms_name_idx on public.classrooms (lower(name));

drop trigger if exists classrooms_author on public.classrooms;
create trigger classrooms_author before insert on public.classrooms
  for each row execute function public.set_author();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.created_by := old.created_by;           -- who added it can't be changed
  new.created_by_name := old.created_by_name;
  return new;
end;
$$;
drop trigger if exists classrooms_touch on public.classrooms;
create trigger classrooms_touch before update on public.classrooms
  for each row execute function public.touch_updated_at();

alter table public.classrooms enable row level security;
revoke all on public.classrooms from anon;

-- Any member can add a class or update its specials (it's a shared job);
-- only whoever added it, or an admin, can delete it.
drop policy if exists "members read classrooms" on public.classrooms;
create policy "members read classrooms" on public.classrooms
  for select to authenticated using (public.is_member());

drop policy if exists "members add classrooms" on public.classrooms;
create policy "members add classrooms" on public.classrooms
  for insert to authenticated with check (public.is_member());

drop policy if exists "members update classrooms" on public.classrooms;
create policy "members update classrooms" on public.classrooms
  for update to authenticated using (public.is_member()) with check (public.is_member());

drop policy if exists "owner or admin deletes classrooms" on public.classrooms;
create policy "owner or admin deletes classrooms" on public.classrooms
  for delete to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()));

-- ---------- Specials rotation (Day 1–4) ----------
-- Classroom schedules are keyed by day number: {"1":["Art"],"2":["Gym"],...}
-- A row here says "this date was Day N". The app counts school days from
-- the latest one, skipping weekends and "No school" days, so snow days and
-- breaks shift the rotation automatically. A newer row corrects it from then on.
create table if not exists public.rotation_anchors (
  anchor_date     date primary key,
  day_number      smallint not null check (day_number between 1 and 4),
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);
drop trigger if exists anchors_author on public.rotation_anchors;
create trigger anchors_author before insert on public.rotation_anchors
  for each row execute function public.set_author();

alter table public.rotation_anchors enable row level security;
revoke all on public.rotation_anchors from anon;

drop policy if exists "members read rotation" on public.rotation_anchors;
create policy "members read rotation" on public.rotation_anchors
  for select to authenticated using (public.is_member());
drop policy if exists "members set rotation" on public.rotation_anchors;
create policy "members set rotation" on public.rotation_anchors
  for insert to authenticated with check (public.is_member());
drop policy if exists "members correct rotation" on public.rotation_anchors;
create policy "members correct rotation" on public.rotation_anchors
  for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists "admins remove rotation" on public.rotation_anchors;
create policy "admins remove rotation" on public.rotation_anchors
  for delete to authenticated using (public.is_admin());

-- ---------- Private photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spelling-photos', 'spelling-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

drop policy if exists "members view photos" on storage.objects;
create policy "members view photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'spelling-photos' and public.is_member());

drop policy if exists "members upload photos" on storage.objects;
create policy "members upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'spelling-photos' and public.is_member());

drop policy if exists "owner or admin deletes photos" on storage.objects;
create policy "owner or admin deletes photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'spelling-photos'
         and (owner_id = auth.uid()::text or public.is_admin()));

-- ---------- Keep-alive ping (used by the GitHub Action) ----------
-- Returns only the current time. It reveals nothing about the group.
create or replace function public.keepalive()
returns timestamptz language sql stable security definer set search_path = public as $$
  select now();
$$;
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

-- ---------- Optional: block sign-up codes for unknown emails ----------
-- Turn on in Supabase → Authentication → Hooks → "Before User Created"
-- → Postgres → public.hook_before_user_created.
-- Without it the app is still locked (strangers see nothing), but with it
-- strangers can't even create an account.
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.members
    where email = lower(coalesce(event -> 'user' ->> 'email', ''))
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email is not on the Morley Moms list.'
    )
  );
end;
$$;
revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- =====================================================================
-- LAST STEP: add yourself as the first admin (change the email + name).
-- Run this once, separately, after the script above:
--
--   insert into public.members (email, display_name, is_admin)
--   values ('you@example.com', 'Your Name', true);
-- =====================================================================
