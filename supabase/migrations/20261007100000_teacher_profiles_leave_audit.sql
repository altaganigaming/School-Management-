alter table public.profiles
  add column if not exists self_editable_fields jsonb not null default '["phone"]'::jsonb
  check (jsonb_typeof(self_editable_fields) = 'array');

alter table public.leave_requests
  add column if not exists reviewed_at timestamptz;

create table if not exists public.leave_request_history (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null,
  requester_id uuid references public.profiles(id) on delete set null,
  requester_name text not null,
  requester_role user_role not null,
  from_date date not null,
  to_date date not null,
  reason text,
  event text not null check (event in ('submitted','decision','snapshot','deleted')),
  previous_status text check (previous_status in ('pending','approved','rejected')),
  status text not null check (status in ('pending','approved','rejected')),
  review_note text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists leave_request_history_request_idx
  on public.leave_request_history (leave_request_id, created_at);
alter table public.leave_request_history enable row level security;
insert into public.leave_request_history (leave_request_id, requester_id, requester_name, requester_role, from_date, to_date, reason, event, previous_status, status, review_note, changed_by, changed_by_name, created_at)
select lr.id, lr.profile_id, requester.full_name, requester.role, lr.from_date, lr.to_date, lr.reason, 'snapshot', null, lr.status, lr.review_note, coalesce(lr.reviewed_by, lr.profile_id), actor.full_name, coalesce(lr.reviewed_at, lr.created_at)
from public.leave_requests lr
join public.profiles requester on requester.id = lr.profile_id
left join public.profiles actor on actor.id = coalesce(lr.reviewed_by, lr.profile_id)
where not exists (
  select 1 from public.leave_request_history h where h.leave_request_id = lr.id
);

create or replace view public.public_teacher_profiles with (security_barrier = true) as
select t.id, t.qualification, p.full_name, p.avatar_url, s.name as subject_name
from public.teachers t
join public.profiles p on p.id = t.profile_id
left join public.subjects s on s.id = t.subject_id
where p.role = 'teacher' and p.is_active;
grant select on public.public_teacher_profiles to anon, authenticated;

create or replace function public.protect_own_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and not is_super_admin() then
    if new.full_name is distinct from old.full_name and not (old.self_editable_fields ? 'full_name') then
      raise exception 'Full name is managed by the school administrator';
    end if;
    if new.phone is distinct from old.phone and not (old.self_editable_fields ? 'phone') then
      raise exception 'Phone is managed by the school administrator';
    end if;
    if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null
      and position('/storage/v1/object/public/avatars/' || old.id::text || '/' in new.avatar_url) = 0 then
      raise exception 'Profile photos must be uploaded to the account avatar folder';
    end if;
    if new.id is distinct from old.id or new.username is distinct from old.username
      or new.role is distinct from old.role or new.permissions is distinct from old.permissions
      or new.self_editable_fields is distinct from old.self_editable_fields
      or new.is_active is distinct from old.is_active then
      raise exception 'Account settings are managed by the school administrator';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.record_leave_request_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requester_name text;
  requester_role user_role;
  actor_id uuid;
  actor_name text;
begin
  if tg_op = 'INSERT' then
    select full_name, role into requester_name, requester_role from public.profiles where id = new.profile_id;
    insert into public.leave_request_history (leave_request_id, requester_id, requester_name, requester_role, from_date, to_date, reason, event, previous_status, status, changed_by, changed_by_name)
    values (new.id, new.profile_id, requester_name, requester_role, new.from_date, new.to_date, new.reason, 'submitted', null, new.status, new.profile_id, requester_name);
  elsif tg_op = 'DELETE' then
    select h.requester_name, h.requester_role into requester_name, requester_role
    from public.leave_request_history h where h.leave_request_id = old.id
    order by h.created_at desc limit 1;
    if requester_name is null then
      select full_name, role into requester_name, requester_role from public.profiles where id = old.profile_id;
    end if;
    actor_id := auth.uid();
    select full_name into actor_name from public.profiles where id = actor_id;
    insert into public.leave_request_history (leave_request_id, requester_id, requester_name, requester_role, from_date, to_date, reason, event, previous_status, status, review_note, changed_by, changed_by_name)
    values (old.id, old.profile_id, coalesce(requester_name, 'Deleted account'), coalesce(requester_role, 'student'), old.from_date, old.to_date, old.reason, 'deleted', old.status, old.status, old.review_note, actor_id, actor_name);
    return old;
  elsif new.status is distinct from old.status then
    select full_name, role into requester_name, requester_role from public.profiles where id = new.profile_id;
    actor_id := coalesce(new.reviewed_by, auth.uid());
    select full_name into actor_name from public.profiles where id = actor_id;
    insert into public.leave_request_history (leave_request_id, requester_id, requester_name, requester_role, from_date, to_date, reason, event, previous_status, status, review_note, changed_by, changed_by_name)
    values (new.id, new.profile_id, requester_name, requester_role, new.from_date, new.to_date, new.reason, 'decision', old.status, new.status, new.review_note, actor_id, actor_name);
  end if;
  return new;
end;
$$;

drop trigger if exists protect_own_profile_fields on public.profiles;
create trigger protect_own_profile_fields
  before update on public.profiles
  for each row execute function public.protect_own_profile_fields();

drop trigger if exists record_leave_request_status on public.leave_requests;
create trigger record_leave_request_status
  after insert or update or delete on public.leave_requests
  for each row execute function public.record_leave_request_status();

drop policy if exists "own profile update basic" on public.profiles;
create policy "own profile update basic"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

drop policy if exists "leave history own or reviewer read" on public.leave_request_history;
create policy "leave history own or reviewer read"
  on public.leave_request_history for select using (requester_id = auth.uid() or has_permission('manage_leave'));
revoke insert, update, delete on public.leave_request_history from anon, authenticated;
grant select on public.leave_request_history to authenticated;

drop policy if exists "leave own pending delete" on public.leave_requests;
create policy "leave own pending delete" on public.leave_requests for delete
  using (profile_id = auth.uid() and status = 'pending');
drop policy if exists "leave reviewer delete" on public.leave_requests;
create policy "leave reviewer delete" on public.leave_requests for delete
  using (has_permission('manage_leave'));

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete
  using (bucket_id = 'avatars' and (
    auth.uid()::text = (storage.foldername(name))[1]
    or ('faculty' = (storage.foldername(name))[1] and auth.uid()::text = (storage.foldername(name))[2])
  ));