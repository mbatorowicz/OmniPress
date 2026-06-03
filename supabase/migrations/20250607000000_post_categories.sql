-- Kategoria wpisu (slug + nazwa z serwisu; opcjonalnie ID kategorii WP)
alter table public.posts
  add column if not exists category_slug text,
  add column if not exists category_name text,
  add column if not exists wp_category_id integer;

create index if not exists posts_category_slug_idx on public.posts (site_id, category_slug);
