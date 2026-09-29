alter table public.leave_requests
  add column if not exists review_note text;
