-- Lets events/homework and spelling lists be tagged for a specific class.
alter table public.events add column if not exists classroom_id uuid references public.classrooms(id) on delete set null;
alter table public.spelling_lists add column if not exists classroom_id uuid references public.classrooms(id) on delete set null;
