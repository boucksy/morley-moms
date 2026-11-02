-- =====================================================================
-- Morley Moms — 2026–27 school calendar preload
-- Run once in Supabase → SQL Editor, AFTER schema.sql. Safe to run again:
-- anything already loaded is skipped.
-- (School calendar only. Pickups with kids' names are in a separate,
--  private file that is NOT stored in GitHub.)
-- =====================================================================
insert into public.events
  (title, category, starts_at, ends_at, all_day, location, details, repeat_days, repeat_until, created_by_name)
select v.title, v.category, v.starts_at, v.ends_at, v.all_day, v.location, v.details, v.repeat_days, v.repeat_until, 'Miranda'
from (values
  ('Morley Moms Night Out — soup night', 'social', timestamptz '2026-11-11 00:00 America/Chicago', null, true, null, 'Probably starts at 6:30 or 7.', null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2026-11-09 18:30 America/Chicago', timestamptz '2026-11-09 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('Wizarding Club', 'kids', timestamptz '2026-11-06 15:38 America/Chicago', timestamptz '2026-11-06 17:00 America/Chicago', false, 'Morley', null, null::text[], null::date),
  ('PTO Family Bingo Night', 'pto', timestamptz '2026-11-13 17:45 America/Chicago', timestamptz '2026-11-13 19:30 America/Chicago', false, null, null, null::text[], null::date),
  ('Wizarding Club', 'kids', timestamptz '2026-11-13 15:38 America/Chicago', timestamptz '2026-11-13 17:00 America/Chicago', false, 'Morley', null, null::text[], null::date),
  ('Wizarding Club', 'kids', timestamptz '2026-11-20 15:38 America/Chicago', timestamptz '2026-11-20 17:00 America/Chicago', false, 'Morley', null, null::text[], null::date),
  ('No school', 'noschool', timestamptz '2026-11-25 00:00 America/Chicago', timestamptz '2026-11-30 00:00 America/Chicago', true, null, null, null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2026-12-07 18:30 America/Chicago', timestamptz '2026-12-07 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('Last day before winter break', 'school', timestamptz '2026-12-22 00:00 America/Chicago', null, true, null, null, null::text[], null::date),
  ('Winter break — no school', 'noschool', timestamptz '2026-12-23 00:00 America/Chicago', timestamptz '2027-01-04 00:00 America/Chicago', true, null, null, null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2027-01-11 18:30 America/Chicago', timestamptz '2027-01-11 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('No school', 'noschool', timestamptz '2027-01-18 00:00 America/Chicago', null, true, null, null, null::text[], null::date),
  ('No school', 'noschool', timestamptz '2027-02-15 00:00 America/Chicago', null, true, null, null, null::text[], null::date),
  ('PTO Trivia Night fundraiser', 'pto', timestamptz '2027-02-19 17:30 America/Chicago', timestamptz '2027-02-19 19:00 America/Chicago', false, null, null, null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2027-02-22 18:30 America/Chicago', timestamptz '2027-02-22 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('Spring break — no school', 'noschool', timestamptz '2027-03-08 00:00 America/Chicago', timestamptz '2027-03-12 00:00 America/Chicago', true, null, null, null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2027-03-22 18:30 America/Chicago', timestamptz '2027-03-22 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('Morley Garden Cleanup', 'volunteer', timestamptz '2027-03-27 09:30 America/Chicago', timestamptz '2027-03-27 10:30 America/Chicago', false, null, null, null::text[], null::date),
  ('No school', 'noschool', timestamptz '2027-04-05 00:00 America/Chicago', null, true, null, null, null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2027-04-19 18:30 America/Chicago', timestamptz '2027-04-19 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('Morley Garden Cleanup', 'volunteer', timestamptz '2027-04-24 09:00 America/Chicago', timestamptz '2027-04-24 10:00 America/Chicago', false, null, null, null::text[], null::date),
  ('No school', 'noschool', timestamptz '2027-04-30 00:00 America/Chicago', null, true, null, null, null::text[], null::date),
  ('Teacher Appreciation Week', 'school', timestamptz '2027-05-03 00:00 America/Chicago', timestamptz '2027-05-07 00:00 America/Chicago', true, null, null, null::text[], null::date),
  ('PTO Family Fun Night', 'pto', timestamptz '2027-05-07 16:00 America/Chicago', timestamptz '2027-05-07 20:00 America/Chicago', false, null, null, null::text[], null::date),
  ('PTO meeting', 'pto', timestamptz '2027-05-10 18:30 America/Chicago', timestamptz '2027-05-10 19:30 America/Chicago', false, 'Morley Library', null, null::text[], null::date),
  ('Last day of school', 'school', timestamptz '2027-05-20 00:00 America/Chicago', null, true, null, null, null::text[], null::date),
  ('Morley Garden Cleanup', 'volunteer', timestamptz '2027-05-22 09:00 America/Chicago', timestamptz '2027-05-22 10:00 America/Chicago', false, null, null, null::text[], null::date)
) as v(title, category, starts_at, ends_at, all_day, location, details, repeat_days, repeat_until)
where not exists (
  select 1 from public.events e where e.title = v.title and e.starts_at = v.starts_at
);

-- Classes. Specials start empty; the group fills them in.
insert into public.classrooms (name, schedule, created_by_name) values
  ('Ms. Carey', '{}'::jsonb, 'Miranda'),
  ('Ms. Walton', '{}'::jsonb, 'Miranda'),
  ('Ms. Wilkinson', '{}'::jsonb, 'Miranda')
on conflict do nothing;

-- Spelling list, test 2026-11-04
insert into public.spelling_lists (week_of, test_date, words, challenge_words, created_by_name)
select date '2026-11-02', date '2026-11-04', array['self','selves','shelf','shelves','thief','thieves','half','halves','loaf','loaves','leaf','leaves','wife','wives','wolf','wolves','elf','elves','knife','knives','life','lives']::text[], array['before','please']::text[], 'Miranda'
where not exists (select 1 from public.spelling_lists where test_date = date '2026-11-04');
