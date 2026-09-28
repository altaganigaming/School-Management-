drop policy if exists "fees admin read" on public.fee_records;
create policy "fees admin read"
  on public.fee_records for select using (
    student_id = my_student_id()
    or (has_permission('manage_fees') and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','staff') and p.is_active
    ))
  );

drop policy if exists "fees admin write" on public.fee_records;
create policy "fees admin write"
  on public.fee_records for all using (
    has_permission('manage_fees') and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','staff') and p.is_active
    )
  ) with check (
    has_permission('manage_fees') and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','staff') and p.is_active
    )
  );

drop policy if exists "receipts student read own" on public.receipts;
create policy "receipts student read own"
  on public.receipts for select using (
    student_id = my_student_id()
    or ((has_permission('verify_payments') or has_permission('manage_fees')) and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','staff') and p.is_active
    ))
  );

drop policy if exists "receipts admin insert" on public.receipts;
create policy "receipts admin insert"
  on public.receipts for insert with check (
    has_permission('verify_payments') and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','staff') and p.is_active
    )
  );
