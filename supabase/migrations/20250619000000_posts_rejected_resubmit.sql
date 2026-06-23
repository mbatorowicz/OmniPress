-- Redaktor może zapisać i ponownie wysłać odrzucony wpis (draft/rejected → pending).

drop policy if exists posts_update_own_draft on public.posts;
create policy posts_update_own_draft on public.posts for update to authenticated
using (
  author_id = auth.uid()
  and status in ('draft', 'rejected')
  and public.user_has_site(site_id)
)
with check (
  author_id = auth.uid()
  and status in ('draft', 'pending', 'rejected')
  and public.user_has_site(site_id)
);

drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets for insert to authenticated
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
      and p.status in ('draft', 'rejected')
      and public.user_has_site(p.site_id)
  )
);
