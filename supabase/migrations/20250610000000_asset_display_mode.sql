-- Tryb wyświetlania załącznika: link lub osadzony PDF
alter table public.assets
  add column if not exists display_mode text not null default 'link';

alter table public.assets
  drop constraint if exists assets_display_mode_check;

alter table public.assets
  add constraint assets_display_mode_check
  check (display_mode in ('link', 'embed'));
