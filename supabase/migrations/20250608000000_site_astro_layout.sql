-- Layout strony Astro (menu, przypisanie kategorii do komponentów) — edycja w OmniPress, sync do GitHub
alter table public.sites
  add column if not exists astro_layout jsonb;
