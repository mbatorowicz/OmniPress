-- Usunięcie śladów WordPress (tylko GitHub → Astro)

alter table public.posts drop column if exists wp_category_id;

create type public.destination_type_new as enum ('github_astro');

alter table public.destinations
  alter column type type public.destination_type_new
  using (
    case
      when type::text = 'github_astro' then 'github_astro'::public.destination_type_new
      else null
    end
  );

drop type public.destination_type;
alter type public.destination_type_new rename to destination_type;
