-- PDF w bucket post-assets + limit 15 MB + upload dla admina na szkicach
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-assets',
  'post-assets',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists post_assets_insert on storage.objects;

create policy post_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-assets'
    and (
      public.current_app_role() = 'admin'
      or exists (
        select 1 from public.posts p
        where p.id::text = (storage.foldername(name))[1]
          and p.author_id = auth.uid()
          and p.status in ('draft', 'rejected')
      )
    )
  );
