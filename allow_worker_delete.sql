-- Allow health workers to delete any health report based on their metadata role
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'health_reports' 
    and policyname = 'Health workers can delete reports'
  ) then
    create policy "Health workers can delete reports"
    on health_reports
    for delete
    to authenticated
    using (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'health_worker'
    );
  end if;
end $$;
