-- Usunięcie konta użytkownika nie kasuje jego wpisów ani stron statycznych:
-- author_id staje się NULL (UI pokazuje „konto usunięte”).

alter table public.posts
	alter column author_id drop not null;

alter table public.posts
	drop constraint posts_author_id_fkey;

alter table public.posts
	add constraint posts_author_id_fkey
	foreign key (author_id) references public.profiles (id) on delete set null;

alter table public.site_pages
	alter column author_id drop not null;

alter table public.site_pages
	drop constraint site_pages_author_id_fkey;

alter table public.site_pages
	add constraint site_pages_author_id_fkey
	foreign key (author_id) references public.profiles (id) on delete set null;
