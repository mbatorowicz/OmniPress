-- Strony statyczne jednostki (admin) — publikacja do repo Astro
create type public.page_status as enum ('draft', 'published');

create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  title text not null default '',
  slug text not null,
  path_prefix text not null default '',
  content_md text not null default '',
  status public.page_status not null default 'draft',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_pages_slug_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) >= 2
  ),
  constraint site_pages_path_prefix_check check (
    path_prefix = '' or path_prefix ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create unique index site_pages_site_path_idx
  on public.site_pages (site_id, path_prefix, slug);

create index site_pages_site_status_idx on public.site_pages (site_id, status);

create trigger site_pages_updated_at
  before update on public.site_pages
  for each row execute function public.set_updated_at();

alter table public.site_pages enable row level security;

create policy site_pages_admin on public.site_pages for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
