-- Import z GitHub: admin musi móc nadpisywać i usuwać załączniki opublikowanych wpisów
create policy post_assets_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-assets'
    and public.current_app_role() = 'admin'
  );

create policy post_assets_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-assets'
    and public.current_app_role() = 'admin'
  )
  with check (
    bucket_id = 'post-assets'
    and public.current_app_role() = 'admin'
  );
