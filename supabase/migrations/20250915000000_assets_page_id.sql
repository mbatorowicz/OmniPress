-- Załączniki stron statycznych: ten sam wiersz `assets` co wpisy
-- (display_mode link|embed, sort_order, content_sha). XOR: post albo strona.
alter table public.assets
  alter column post_id drop not null;

alter table public.assets
  add column if not exists page_id uuid references public.site_pages (id) on delete cascade;

alter table public.assets
  drop constraint if exists assets_owner_xor;

alter table public.assets
  add constraint assets_owner_xor check (
    (post_id is not null and page_id is null)
    or (post_id is null and page_id is not null)
  );

create index if not exists assets_page_sort_idx
  on public.assets (page_id, sort_order, created_at)
  where page_id is not null;
