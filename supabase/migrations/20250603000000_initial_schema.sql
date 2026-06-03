-- OmniPress — schemat początkowy (Faza 1)
-- Uruchom w Supabase SQL Editor lub: supabase db push

-- Rozszerzenia
create extension if not exists "pgcrypto";

-- Role aplikacji
create type public.app_role as enum ('editor', 'admin');
create type public.post_status as enum ('draft', 'pending', 'published', 'rejected');
create type public.destination_type as enum ('wordpress', 'github_astro');
create type public.publish_log_status as enum ('pending', 'success', 'failed', 'withdrawn');

-- Strony logiczne (gmina, szkoły…)
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Profile powiązane z auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'editor',
  display_name text,
  default_site_id uuid references public.sites (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dostęp redaktora do wielu stron
create table public.user_sites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  primary key (user_id, site_id)
);

-- Destynacje techniczne (credentials szyfrowane po stronie aplikacji)
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.destination_type not null,
  config jsonb not null default '{}'::jsonb,
  encrypted_credentials text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mapowanie strona → destynacje
create table public.site_destinations (
  site_id uuid not null references public.sites (id) on delete cascade,
  destination_id uuid not null references public.destinations (id) on delete cascade,
  is_default boolean not null default false,
  sort_order int not null default 0,
  primary key (site_id, destination_id)
);

-- Artykuły
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id),
  author_id uuid not null references public.profiles (id),
  title text not null default '',
  slug text,
  content_md text not null default '',
  status public.post_status not null default 'draft',
  rejection_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_site_status_idx on public.posts (site_id, status);
create index posts_author_idx on public.posts (author_id);

-- Załączniki
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- Logi publikacji
create table public.publish_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  destination_id uuid not null references public.destinations (id),
  status public.publish_log_status not null default 'pending',
  external_id text,
  response_summary text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- Trigger: profil po rejestracji
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: updated_at na profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger destinations_updated_at
  before update on public.destinations
  for each row execute function public.set_updated_at();

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Pomocnicze: rola z JWT / profilu
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.user_has_site(target_site uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_sites us
    where us.user_id = auth.uid() and us.site_id = target_site
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.default_site_id = target_site
  )
  or public.current_app_role() = 'admin';
$$;

-- RLS
alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.user_sites enable row level security;
alter table public.destinations enable row level security;
alter table public.site_destinations enable row level security;
alter table public.posts enable row level security;
alter table public.assets enable row level security;
alter table public.publish_logs enable row level security;

-- sites: redaktor widzi przypisane; admin wszystko
create policy sites_select on public.sites for select to authenticated
using (
  public.current_app_role() = 'admin'
  or id in (select site_id from public.user_sites where user_id = auth.uid())
  or id = (select default_site_id from public.profiles where id = auth.uid())
);

create policy sites_admin_all on public.sites for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- profiles
create policy profiles_select_own on public.profiles for select to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin');

create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_update on public.profiles for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- user_sites
create policy user_sites_select on public.user_sites for select to authenticated
using (user_id = auth.uid() or public.current_app_role() = 'admin');

create policy user_sites_admin on public.user_sites for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- destinations: tylko admin
create policy destinations_admin on public.destinations for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- site_destinations: admin pełny; redaktor brak (domyślnie deny)

create policy site_destinations_admin on public.site_destinations for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- posts
create policy posts_select on public.posts for select to authenticated
using (
  public.current_app_role() = 'admin'
  or (author_id = auth.uid() and public.user_has_site(site_id))
  or (status = 'pending' and public.current_app_role() = 'admin')
);

create policy posts_insert on public.posts for insert to authenticated
with check (
  author_id = auth.uid()
  and public.user_has_site(site_id)
);

create policy posts_update_own_draft on public.posts for update to authenticated
using (
  author_id = auth.uid()
  and status = 'draft'
  and public.user_has_site(site_id)
)
with check (
  author_id = auth.uid()
  and status in ('draft', 'pending')
  and public.user_has_site(site_id)
);

create policy posts_admin on public.posts for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- assets (via post ownership)
create policy assets_select on public.assets for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
    and (
      public.current_app_role() = 'admin'
      or (p.author_id = auth.uid() and public.user_has_site(p.site_id))
    )
  )
);

create policy assets_insert on public.assets for insert to authenticated
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id
    and p.author_id = auth.uid()
    and p.status = 'draft'
    and public.user_has_site(p.site_id)
  )
);

create policy assets_admin on public.assets for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- publish_logs: admin + autor widzi własne
create policy publish_logs_select on public.publish_logs for select to authenticated
using (
  public.current_app_role() = 'admin'
  or exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = auth.uid()
  )
);

create policy publish_logs_admin on public.publish_logs for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Storage bucket (uruchom osobno w panelu lub rozszerz migrację)
-- insert into storage.buckets (id, name, public) values ('post-assets', 'post-assets', false);

-- Dane startowe (opcjonalnie — odkomentuj po utworzeniu pierwszego admina w SQL)
-- insert into public.sites (name, slug) values ('UG Miedzna', 'ug-miedzna');
