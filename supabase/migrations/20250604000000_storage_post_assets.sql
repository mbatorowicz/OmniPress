-- Faza 2: bucket na zdjęcia artykułów
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-assets',
  'post-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- INSERT: autor szkicu
create policy post_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-assets'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[1]
        and p.author_id = auth.uid()
        and p.status = 'draft'
    )
  );

-- SELECT: autor lub admin
create policy post_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-assets'
    and (
      public.current_app_role() = 'admin'
      or exists (
        select 1 from public.posts p
        where p.id::text = (storage.foldername(name))[1]
          and p.author_id = auth.uid()
      )
    )
  );

-- DELETE: autor szkicu
create policy post_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-assets'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[1]
        and p.author_id = auth.uid()
        and p.status = 'draft'
    )
  );
