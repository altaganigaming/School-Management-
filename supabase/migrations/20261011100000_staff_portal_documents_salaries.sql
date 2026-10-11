alter table public.documents
  drop constraint if exists documents_audience_check;

alter table public.documents
  add constraint documents_audience_check
  check (audience in ('public', 'student', 'teacher', 'staff'));

drop policy if exists "docs read" on public.documents;
create policy "docs read"
  on public.documents for select using (
    audience = 'public'
    or exists (select 1 from public.profiles where id = auth.uid() and is_active and role::text = audience)
    or exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'super_admin')
    or has_permission('manage_documents')
  );

update storage.buckets set public = false where id = 'documents';
drop policy if exists "docs public read" on storage.objects;
drop policy if exists "docs admin write" on storage.objects;

alter table public.salary_records
  alter column teacher_id drop not null;

alter table public.salary_records
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

alter table public.salary_records
  add constraint salary_records_owner_check
  check (num_nonnulls(teacher_id, profile_id) = 1);

create unique index if not exists salary_records_profile_month_unique
  on public.salary_records (profile_id, month);

drop policy if exists "salary teacher read own" on public.salary_records;
create policy "salary teacher read own"
  on public.salary_records for select
  using (teacher_id = my_teacher_id() or profile_id = auth.uid() or has_permission('manage_salaries'));