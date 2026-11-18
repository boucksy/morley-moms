-- An event can be linked to the plan it came from. Deleting the plan removes the event too.
alter table public.events add column if not exists plan_id uuid references public.plans(id) on delete cascade;
create index if not exists events_plan_id_idx on public.events (plan_id);
