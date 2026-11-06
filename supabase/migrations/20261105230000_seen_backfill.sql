-- Fill "last seen" from real sign-in and session activity that Supabase already recorded.
-- Never lowers a time that is already there.
insert into public.member_seen (email, last_seen_at)
select lower(u.email), u.last_sign_in_at
from auth.users u
join public.members m on m.email = lower(u.email)
where u.last_sign_in_at is not null
on conflict (email) do update
  set last_seen_at = greatest(public.member_seen.last_seen_at, excluded.last_seen_at);

-- Session refreshes happen while the app is in use, so they are a better "last opened" signal.
-- Wrapped so a different auth schema version can never fail the deploy.
do $$
begin
  insert into public.member_seen (email, last_seen_at)
  select lower(u.email), max(t.updated_at)
  from auth.refresh_tokens t
  join auth.users u on u.id::text = t.user_id::text
  join public.members m on m.email = lower(u.email)
  group by lower(u.email)
  on conflict (email) do update
    set last_seen_at = greatest(public.member_seen.last_seen_at, excluded.last_seen_at);
exception when others then
  raise notice 'refresh token backfill skipped: %', sqlerrm;
end $$;
