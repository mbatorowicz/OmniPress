-- S-3: bucket post-assets prywatny — koniec z anonimowym /object/public/…
-- Pliki wychodzą do panelu przez /api/posts/{id}/assets/{assetId}/file (RLS + sesja),
-- a na stronę przez commit w repo Astro. MIME i limit rozmiaru bez zmian.
update storage.buckets
set public = false
where id = 'post-assets';

-- Odczyt zostaje przy autorze i adminie (post_assets_select z 20250604000000),
-- ale po prywatyzacji jest to jedyna droga do pliku, więc odtwarzamy politykę
-- na wypadek bazy, w której została zmieniona ręcznie.
drop policy if exists post_assets_select on storage.objects;

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
