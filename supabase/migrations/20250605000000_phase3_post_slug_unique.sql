-- Faza 3: unikalny slug w ramach strony
create unique index if not exists posts_site_slug_unique
	on public.posts (site_id, slug)
	where slug is not null and slug <> '';
