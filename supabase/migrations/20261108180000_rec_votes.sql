-- "Me too": a mom can add her own recommendation on top of someone else's.
create table if not exists public.rec_votes (
  rec_id      uuid not null references public.recs(id) on delete cascade,
  member_id   uuid not null,
  member_name text,
  created_at  timestamptz not null default now(),
  primary key (rec_id, member_id)
);
alter table public.rec_votes enable row level security;
revoke all on public.rec_votes from anon;
drop policy if exists "members read rec votes" on public.rec_votes;
create policy "members read rec votes" on public.rec_votes
  for select to authenticated using (public.is_member());
drop policy if exists "add my rec vote" on public.rec_votes;
create policy "add my rec vote" on public.rec_votes
  for insert to authenticated with check (public.is_member() and member_id = auth.uid());
drop policy if exists "remove my rec vote" on public.rec_votes;
create policy "remove my rec vote" on public.rec_votes
  for delete to authenticated using (member_id = auth.uid());
