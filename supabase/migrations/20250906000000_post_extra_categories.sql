-- Dodatkowe kategorie wpisu (poza główną w category_slug).
-- Główna ustala URL /{category}/{slug}; dodatkowe — archiwa i feedy (np. strona główna).

alter table public.posts
  add column if not exists extra_category_slugs text[] not null default '{}';

comment on column public.posts.extra_category_slugs is
  'Slugi dodatkowych kategorii (bez głównej). Wpis pojawia się też w tych archiwach i feedach.';
