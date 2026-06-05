-- Kolejność zdjęć w galerii (pierwsze = zajawka)
alter table public.assets
  add column if not exists sort_order int not null default 0;

create index if not exists assets_post_sort_idx on public.assets (post_id, sort_order, created_at);
