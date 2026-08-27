-- Przypięte wpisy na stronie głównej (front-matter pinned: true)

alter table public.posts
  add column if not exists pinned boolean not null default false;

create index if not exists posts_pinned_idx
  on public.posts (site_id, pinned)
  where pinned = true;
