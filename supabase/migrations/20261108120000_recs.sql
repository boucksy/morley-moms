-- Recommendations: anything a mom wants to recommend (doctors, books, food...).
create table if not exists public.recs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 120),
  category        text,
  notes           text check (char_length(notes) <= 2000),
  link            text check (char_length(link) <= 500),
  photo_path      text,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);
drop trigger if exists recs_author on public.recs;
create trigger recs_author before insert on public.recs
  for each row execute function public.set_author();
drop trigger if exists recs_keep_author on public.recs;
create trigger recs_keep_author before update on public.recs
  for each row execute function public.keep_author();

alter table public.recs enable row level security;
revoke all on public.recs from anon;

drop policy if exists "members read recs" on public.recs;
create policy "members read recs" on public.recs
  for select to authenticated using (public.is_member());
drop policy if exists "members add recs" on public.recs;
create policy "members add recs" on public.recs
  for insert to authenticated with check (public.is_member());
drop policy if exists "owner or admin edits recs" on public.recs;
create policy "owner or admin edits recs" on public.recs
  for update to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_member());
drop policy if exists "owner or admin deletes recs" on public.recs;
create policy "owner or admin deletes recs" on public.recs
  for delete to authenticated
  using (public.is_member() and (created_by = auth.uid() or public.is_admin()));
