-- Plans can have a start time and a free-text cost (e.g. "$34/adults, $10/kids").
alter table public.plans add column if not exists plan_time text;
alter table public.plans add column if not exists cost text check (char_length(cost) <= 120);
