create table if not exists public.faculty_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  description text not null default '',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.faculty_profiles enable row level security;

drop policy if exists "faculty public read" on public.faculty_profiles;
create policy "faculty public read"
  on public.faculty_profiles for select using (is_published);
drop policy if exists "faculty principal write" on public.faculty_profiles;
create policy "faculty principal write"
  on public.faculty_profiles for all using (is_super_admin()) with check (is_super_admin());

grant select on public.faculty_profiles to anon, authenticated;
