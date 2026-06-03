-- Przykładowe dane po utworzeniu użytkownika w Supabase Auth
-- Zamień USER_UUID na id z Authentication → Users

-- insert into public.sites (name, slug) values
--   ('UG Miedzna', 'ug-miedzna'),
--   ('Szkoła Podstawowa', 'sp-przyklad');

-- update public.profiles set role = 'admin', default_site_id = (select id from sites where slug = 'ug-miedzna')
-- where id = 'USER_UUID';

-- insert into public.user_sites (user_id, site_id)
-- select 'USER_UUID', id from public.sites where slug = 'sp-przyklad';

-- insert into public.destinations (name, type, config) values
--   ('WP — produkcja gminy', 'wordpress', '{"rest_base":"https://gmina.example/wp-json/wp/v2"}'::jsonb),
--   ('Astro — gmina-miedzna.pl', 'github_astro', '{"repo":"mbatorowicz/gmina-miedzna.pl","branch":"main","content_path":"src/content"}'::jsonb);

-- insert into public.site_destinations (site_id, destination_id, is_default, sort_order)
-- select s.id, d.id, true, 0
-- from public.sites s, public.destinations d
-- where s.slug = 'ug-miedzna' and d.name = 'WP — produkcja gminy';
