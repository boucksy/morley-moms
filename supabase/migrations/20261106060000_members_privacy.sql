-- Privacy: moms can no longer read each other's email addresses.
-- Admins still see the full list; everyone else sees names only, plus their own row.
drop policy if exists "members can view members" on public.members;
drop policy if exists "members see own row, admins see all" on public.members;
create policy "members see own row, admins see all" on public.members
  for select to authenticated
  using (public.is_admin() or email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Names only, for the group list (no email column).
create or replace view public.member_names as
  select display_name, is_admin, added_at
  from public.members
  where public.is_member();
revoke all on public.member_names from anon;
grant select on public.member_names to authenticated;
