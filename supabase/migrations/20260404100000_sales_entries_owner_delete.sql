create policy "Owner can delete sales entries"
  on public.sales_entries for delete
  using (get_my_role() = 'owner');
