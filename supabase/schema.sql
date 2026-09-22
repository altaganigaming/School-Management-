-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM - PostgreSQL Schema + RLS
-- Run this in Supabase SQL Editor, then run seed.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type user_role as enum ('super_admin', 'teacher', 'staff', 'student');

-- ---------- PROFILES (one row per auth user) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text not null,
  role        user_role not null default 'student',
  permissions jsonb not null default '[]'::jsonb, -- array of permission keys
  avatar_url  text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- SCHOOL SETTINGS (key/value jsonb CMS) ----------
create table public.school_settings (
  key   text primary key,
  value jsonb not null
);

create table public.admission_inquiries (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  parent_name text,
  email text not null,
  phone text not null,
  class_name text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.admission_inquiries enable row level security;

-- ---------- CLASSES & SECTIONS ----------
create table public.classes (
  id    uuid primary key default gen_random_uuid(),
  name    text not null,
  section text not null default 'A',
  unique (name, section)
);

create table public.subjects (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- ---------- TEACHERS ----------
create table public.teachers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid unique references public.profiles(id) on delete cascade,
  employee_id  text unique not null,
  qualification text,
  subject_id   uuid references public.subjects(id) on delete set null,
  assigned_classes jsonb not null default '[]'::jsonb, -- array of class ids
  joining_date date,
  address      text,
  created_at   timestamptz not null default now()
);

-- ---------- STUDENTS ----------
create table public.students (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid unique references public.profiles(id) on delete cascade,
  admission_no  text unique not null,
  class_id      uuid references public.classes(id) on delete set null,
  roll_no       integer,
  dob           date,
  parent_name   text,
  parent_phone  text,
  address       text,
  monthly_fee   numeric(10,2) not null default 0,
  admission_date date not null default current_date,
  created_at    timestamptz not null default now()
);

-- ---------- FEE LEDGER (one row per student per month "YYYY-MM") ----------
create table public.fee_records (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  month      text not null,               -- '2026-04'
  amount     numeric(10,2) not null,
  status     text not null default 'pending' check (status in ('pending','paid')),
  paid_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, month)
);

-- ---------- PAYMENT PROOF SUBMISSIONS ----------
create table public.payment_proofs (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  month           text not null,
  amount          numeric(10,2) not null,
  method          text not null,           -- cash / bank / upi / other
  reference_no    text,
  proof_url       text,                    -- storage screenshot
  note            text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  receipt_id      uuid,
  rejection_reason text,
  submitted_by    uuid references public.profiles(id),
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- RECEIPTS ----------
create table public.receipts (
  id          uuid primary key default gen_random_uuid(),
  receipt_no  text unique not null,
  student_id  uuid not null references public.students(id) on delete cascade,
  month       text not null,
  amount      numeric(10,2) not null,
  method      text,
  reference_no text,
  issued_by   uuid references public.profiles(id),
  issued_at   timestamptz not null default now()
);

alter table public.payment_proofs
  add constraint fk_receipt foreign key (receipt_id) references public.receipts(id) on delete set null;

-- ---------- SALARIES ----------
create table public.salary_records (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  month       text not null,               -- '2026-04'
  amount      numeric(10,2) not null,
  status      text not null default 'pending' check (status in ('pending','paid')),
  paid_at     timestamptz,
  approved_by uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (teacher_id, month)
);

-- ---------- ATTENDANCE ----------
create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date       date not null,
  status     text not null check (status in ('present','absent','late','leave')),
  note       text,
  marked_by  uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- ---------- LEAVE ----------
create table public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  type        text not null default 'casual', -- casual / sick / other
  from_date   date not null,
  to_date     date not null,
  reason      text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------- ACADEMICS ----------
create table public.homework (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes(id) on delete cascade,
  subject_id    uuid references public.subjects(id) on delete set null,
  title         text not null,
  description   text,
  attachment_url text,
  due_date      date,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

create table public.study_materials (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references public.classes(id) on delete cascade, -- null = all classes
  subject_id  uuid references public.subjects(id) on delete set null,
  title       text not null,
  description text,
  file_url    text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.timetable (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  period_no  smallint not null,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  start_time time,
  end_time   time,
  unique (class_id, day_of_week, period_no)
);

create table public.exams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  class_id   uuid not null references public.classes(id) on delete cascade,
  start_date date,
  end_date   date,
  created_at timestamptz not null default now()
);

create table public.exam_results (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  marks      numeric(6,2) not null default 0,
  max_marks  numeric(6,2) not null default 100,
  grade      text,
  unique (exam_id, student_id, subject_id)
);

-- ---------- CONTENT / CMS ----------
create table public.notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text,
  category     text not null default 'notice', -- notice / news / event
  attachment_url text,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_by   uuid references public.profiles(id)
);

create table public.documents (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  file_url   text not null,
  category   text not null default 'general',
  audience   text not null default 'public' check (audience in ('public','student','teacher')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.gallery (
  id       uuid primary key default gen_random_uuid(),
  title    text not null,
  image_url text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_date  date not null,
  image_url   text,
  created_at  timestamptz not null default now()
);

create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  achieved_on date,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('super_admin','teacher','staff') and is_active
  );
$$;

create or replace function public.has_permission(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and (
      role = 'super_admin' or (
        role in ('teacher','staff') and permissions @> jsonb_build_array(p)
      )
    )
  );
$$;

create or replace function public.my_student_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.students where profile_id = auth.uid() limit 1;
$$;

create or replace function public.my_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.teachers where profile_id = auth.uid() limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.school_settings enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.fee_records enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.receipts enable row level security;
alter table public.salary_records enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.homework enable row level security;
alter table public.study_materials enable row level security;
alter table public.timetable enable row level security;
alter table public.exams enable row level security;
alter table public.exam_results enable row level security;
alter table public.notices enable row level security;
alter table public.documents enable row level security;
alter table public.gallery enable row level security;
alter table public.events enable row level security;
alter table public.achievements enable row level security;
alter table public.admission_inquiries enable row level security;

-- ---------- profiles ----------
create policy "profiles select own or admin"
  on public.profiles for select using (
    id = auth.uid()
    or is_super_admin()
    or (is_active_admin() and (role = 'student' or has_permission('manage_faculty')))
  );
create policy "super admin manages profiles"
  on public.profiles for all using (is_super_admin()) with check (is_super_admin());
create policy "admins manage students"
  on public.profiles for update using (has_permission('manage_students') and role = 'student');
create policy "own profile update basic"
  on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- ---------- school settings ----------
create policy "settings readable"
  on public.school_settings for select using (true);
create policy "settings super admin write"
  on public.school_settings for all using (is_super_admin()) with check (is_super_admin());
create policy "settings website cms write"
  on public.school_settings for insert with check (has_permission('manage_website'));
create policy "settings website cms update"
  on public.school_settings for update using (has_permission('manage_website'));

-- ---------- classes / subjects ----------
create policy "classes read" on public.classes for select using (true);
create policy "classes write" on public.classes for all using (has_permission('manage_classes')) with check (has_permission('manage_classes'));
create policy "subjects read" on public.subjects for select using (true);
create policy "subjects write" on public.subjects for all using (has_permission('manage_classes')) with check (has_permission('manage_classes'));

-- ---------- teachers ----------
create policy "teachers public read"
  on public.teachers for select using (true);
create policy "teachers manage faculty"
  on public.teachers for all using (has_permission('manage_faculty')) with check (has_permission('manage_faculty'));
create policy "teachers update own profile"
  on public.teachers for update using (profile_id = auth.uid());

-- ---------- students ----------
create policy "students admin read"
  on public.students for select using (is_active_admin() or profile_id = auth.uid());
create policy "students manage"
  on public.students for all using (has_permission('manage_students')) with check (has_permission('manage_students'));
create policy "students read own"
  on public.students for select using (profile_id = auth.uid());

-- ---------- fee records ----------
create policy "fees admin read"
  on public.fee_records for select using (has_permission('manage_fees') or student_id = my_student_id());
create policy "fees admin write"
  on public.fee_records for all using (has_permission('manage_fees')) with check (has_permission('manage_fees'));

-- ---------- payment proofs ----------
create policy "proofs student insert own"
  on public.payment_proofs for insert with check (student_id = my_student_id() and status = 'pending');
create policy "proofs student read own"
  on public.payment_proofs for select using (student_id = my_student_id() or has_permission('verify_payments'));
create policy "proofs admin write"
  on public.payment_proofs for update using (has_permission('verify_payments')) with check (has_permission('verify_payments'));

-- ---------- receipts ----------
create policy "receipts student read own"
  on public.receipts for select using (student_id = my_student_id() or has_permission('verify_payments') or has_permission('manage_fees'));
create policy "receipts admin insert"
  on public.receipts for insert with check (has_permission('verify_payments'));

-- ---------- salaries ----------
create policy "salary teacher read own"
  on public.salary_records for select using (teacher_id = my_teacher_id() or has_permission('manage_salaries'));
create policy "salary admin write"
  on public.salary_records for all using (has_permission('manage_salaries')) with check (has_permission('manage_salaries'));

-- ---------- attendance ----------
create policy "attendance admin read"
  on public.attendance for select using (has_permission('manage_attendance') or student_id = my_student_id());
create policy "attendance admin write"
  on public.attendance for all using (has_permission('manage_attendance')) with check (has_permission('manage_attendance'));

-- ---------- leave ----------
create policy "leave own insert"
  on public.leave_requests for insert with check (profile_id = auth.uid());
create policy "leave own read"
  on public.leave_requests for select using (profile_id = auth.uid() or has_permission('manage_leave'));
create policy "leave admin write"
  on public.leave_requests for update using (has_permission('manage_leave')) with check (has_permission('manage_leave'));

-- ---------- homework ----------
create policy "homework read"
  on public.homework for select using (
    is_active_admin() or exists (
      select 1 from students s where s.profile_id = auth.uid() and s.class_id = homework.class_id
    ) or has_permission('manage_homework')
  );
create policy "homework admin write"
  on public.homework for all using (has_permission('manage_homework')) with check (has_permission('manage_homework'));

-- ---------- study materials ----------
create policy "materials read"
  on public.study_materials for select using (
    is_active_admin() or has_permission('manage_materials')
    or exists (select 1 from students s where s.profile_id = auth.uid()
               and (study_materials.class_id is null or s.class_id = study_materials.class_id))
  );
create policy "materials admin write"
  on public.study_materials for all using (has_permission('manage_materials')) with check (has_permission('manage_materials'));

-- ---------- timetable ----------
create policy "timetable read"
  on public.timetable for select using (
    is_active_admin() or has_permission('manage_timetable')
    or exists (select 1 from students s where s.profile_id = auth.uid() and s.class_id = timetable.class_id)
  );
create policy "timetable admin write"
  on public.timetable for all using (has_permission('manage_timetable')) with check (has_permission('manage_timetable'));

-- ---------- exams / results ----------
create policy "exams read"
  on public.exams for select using (
    is_active_admin() or has_permission('manage_exams')
    or exists (select 1 from students s where s.profile_id = auth.uid() and s.class_id = exams.class_id)
  );
create policy "exams admin write"
  on public.exams for all using (has_permission('manage_exams')) with check (has_permission('manage_exams'));
create policy "results student read own"
  on public.exam_results for select using (
    student_id = my_student_id() or has_permission('manage_exams')
  );
create policy "results admin write"
  on public.exam_results for all using (has_permission('manage_exams')) with check (has_permission('manage_exams'));

-- ---------- content ----------
create policy "public admission insert" on public.admission_inquiries for insert with check (true);
create policy "admin admission read" on public.admission_inquiries for select using (is_active_admin());

create policy "notices public read"
  on public.notices for select using (is_published or is_active_admin());
create policy "notices admin write"
  on public.notices for all using (has_permission('manage_notices')) with check (has_permission('manage_notices'));

create policy "docs read"
  on public.documents for select using (
    audience = 'public' or is_active_admin()
    or (audience = 'student' and exists (select 1 from profiles where id = auth.uid() and role = 'student'))
    or (audience = 'teacher' and exists (select 1 from profiles where id = auth.uid() and role in ('teacher','staff','super_admin')))
  );
create policy "docs admin write"
  on public.documents for all using (has_permission('manage_documents')) with check (has_permission('manage_documents'));

create policy "gallery public read" on public.gallery for select using (true);
create policy "gallery admin write" on public.gallery for all using (has_permission('manage_gallery')) with check (has_permission('manage_gallery'));
create policy "events public read" on public.events for select using (true);
create policy "events admin write" on public.events for all using (has_permission('manage_events')) with check (has_permission('manage_events'));
create policy "achievements public read" on public.achievements for select using (true);
create policy "achievements admin write" on public.achievements for all using (has_permission('manage_achievements')) with check (has_permission('manage_achievements'));

-- ============================================================
-- STORAGE BUCKETS (run after enabling Storage)
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('proofs', 'proofs', false),
  ('documents', 'documents', true),
  ('gallery', 'gallery', true),
  ('avatars', 'avatars', true)
on conflict do nothing;

create policy "proofs upload own" on storage.objects for insert
  with check (bucket_id = 'proofs' and auth.role() = 'authenticated');
create policy "proofs read admin or own" on storage.objects for select
  using (bucket_id = 'proofs' and (is_active_admin() or auth.uid()::text = (storage.foldername(name))[1]));
create policy "docs public read" on storage.objects for select
  using (bucket_id = 'documents');
create policy "docs admin write" on storage.objects for all
  using (bucket_id = 'documents' and is_active_admin());
create policy "gallery public read" on storage.objects for select
  using (bucket_id = 'gallery');
create policy "gallery admin write" on storage.objects for all
  using (bucket_id = 'gallery' and has_permission('manage_gallery'));
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars write own" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
