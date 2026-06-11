-- Redaktor może trwale usunąć własny wpis przed publikacją (szkic lub odrzucony).
-- Wpisy pending/published pozostają wyłącznie w gestii administratora.

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts for delete to authenticated
using (
  author_id = auth.uid()
  and status in ('draft', 'rejected')
  and public.user_has_site(site_id)
);

-- Storage: autor sprząta pliki także przy wpisie odrzuconym (dotąd tylko szkic).
drop policy if exists post_assets_delete on storage.objects;
create policy post_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-assets'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[1]
        and p.author_id = auth.uid()
        and p.status in ('draft', 'rejected')
    )
  );
