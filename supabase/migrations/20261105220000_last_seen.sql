-- Last-seen times for the group list. Only admins can read them;
-- members can only record their own visit through touch_seen().
create table if not exists public.member_seen (
  email text primary key check (email = lower(email)),
  last_seen_at timestamptz not null default now()
);
alter table public.member_seen enable row level security;
drop policy if exists "admins read last seen" on public.member_seen;
create policy "admins read last seen" on public.member_seen for select to authenticated
  using (public.is_admin());

create or replace function public.touch_seen()
returns void language sql security definer set search_path = public as $$
  insert into public.member_seen (email, last_seen_at)
  select lower(auth.jwt() ->> 'email'), now()
  where public.is_member()
  on conflict (email) do update set last_seen_at = excluded.last_seen_at;
$$;
revoke all on function public.touch_seen() from public, anon;
grant execute on function public.touch_seen() to authenticated;
