create or replace function public.hard_delete_leave_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  request_owner uuid;
  request_status text;
begin
  select profile_id, status into request_owner, request_status
  from public.leave_requests where id = p_request_id;
  if not found then
    raise exception 'Leave request not found';
  end if;
  if request_owner is distinct from auth.uid() and not has_permission('manage_leave') then
    raise exception 'Not allowed to delete this leave request';
  end if;
  if request_owner = auth.uid() and request_status <> 'pending' and not has_permission('manage_leave') then
    raise exception 'Only pending leave requests can be deleted by the applicant';
  end if;

  delete from public.leave_requests where id = p_request_id;
  delete from public.leave_request_history where leave_request_id = p_request_id;
end;
$$;
revoke all on function public.hard_delete_leave_request(uuid) from public, anon;
grant execute on function public.hard_delete_leave_request(uuid) to authenticated;