-- Suggestions and bug reports from the app's settings sheet.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'idea',
  message text not null,
  member_name text,
  app_version int,
  user_agent text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "members send feedback" on public.feedback;
create policy "members send feedback" on public.feedback for insert to authenticated
  with check (public.is_member());
drop policy if exists "admins read feedback" on public.feedback;
create policy "admins read feedback" on public.feedback for select to authenticated
  using (public.is_admin());
