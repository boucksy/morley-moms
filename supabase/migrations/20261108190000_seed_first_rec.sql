-- First recommendation, added by Miranda.
insert into public.recs (title, category, notes, link, created_by_name)
select 'Schoettger Orthodontics', 'care',
  'Orthodontist, 5.0 stars on Google (495 reviews). 8000 S 13th St, Lincoln. (402) 423-8000. Braces, Invisalign and SureSmile, plus early treatment for kids. Reviewers say scheduling is easy and flexible, and there is an ice cream machine in the waiting room.',
  'https://www.schoettger.com/', 'Miranda'
where not exists (select 1 from public.recs where title = 'Schoettger Orthodontics');
