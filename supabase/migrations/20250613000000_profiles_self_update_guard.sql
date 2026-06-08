-- Blokada eskalacji: redaktor nie może zmienić role ani default_site_id własnego profilu.
create or replace function public.guard_profiles_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Admin edytuje innego użytkownika (polityka profiles_admin_update)
  if auth.uid() is distinct from old.id then
    return new;
  end if;

  -- Admin edytuje własny profil
  if public.current_app_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'forbidden_profile_field: role';
  end if;

  if new.default_site_id is distinct from old.default_site_id then
    raise exception 'forbidden_profile_field: default_site_id';
  end if;

  if new.id is distinct from old.id then
    raise exception 'forbidden_profile_field: id';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;

create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profiles_self_update();
