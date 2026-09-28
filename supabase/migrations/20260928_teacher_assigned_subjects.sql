alter table public.teachers
  add column if not exists assigned_subjects jsonb not null default '[]'::jsonb;

update public.teachers
set assigned_subjects = jsonb_build_array(subject_id::text)
where subject_id is not null
  and assigned_subjects = '[]'::jsonb;
