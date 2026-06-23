-- Redaktor usuwa i aktualizuje załączniki (PDF, galeria) na szkicu lub odrzuconym wpisie.

create policy assets_delete_own on public.assets for delete to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
      and p.status in ('draft', 'rejected')
      and public.user_has_site(p.site_id)
  )
);

create policy assets_update_own on public.assets for update to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
      and p.status in ('draft', 'rejected')
      and public.user_has_site(p.site_id)
  )
)
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
      and p.status in ('draft', 'rejected')
      and public.user_has_site(p.site_id)
  )
);
