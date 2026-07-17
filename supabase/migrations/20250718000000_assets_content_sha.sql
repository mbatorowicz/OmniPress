-- Skrót treści (Git blob SHA-1) — pomijanie ponownego transferu przy sync/publish.
alter table public.assets
  add column if not exists content_sha text;

comment on column public.assets.content_sha is
  'SHA-1 bloba Gita (hex); porównywany z GitHub Contents API sha przy imporcie/publikacji.';
