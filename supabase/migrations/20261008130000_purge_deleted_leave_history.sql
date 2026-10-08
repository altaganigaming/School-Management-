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

drop trigger if exists record_leave_request_status on public.leave_requests;
create trigger record_leave_request_status
  after insert or update on public.leave_requests
  for each row execute function public.record_leave_request_status();

revoke delete on public.leave_requests from authenticated;

delete from public.leave_request_history h
where not exists (
  select 1 from public.leave_requests lr where lr.id = h.leave_request_id
);