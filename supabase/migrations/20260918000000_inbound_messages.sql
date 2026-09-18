-- Idempotencja webhooka poczty inbound: jeden message_id = jeden szkic.

create table public.inbound_messages (
	id uuid primary key default gen_random_uuid(),
	message_id text not null unique,
	from_email text not null,
	post_id uuid not null references public.posts (id) on delete cascade,
	created_at timestamptz not null default now()
);

create index inbound_messages_post_id_idx on public.inbound_messages (post_id);

alter table public.inbound_messages enable row level security;

comment on table public.inbound_messages is
	'Klucz idempotencji maili inbound. Dostep wylacznie service_role (brak polityk RLS).';

create or replace function public.inbound_author_id(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select p.id
	from public.profiles p
	join auth.users u on u.id = p.id
	where lower(u.email) = lower(trim(p_email))
	limit 1
$$;

revoke all on function public.inbound_author_id(text) from public;
grant execute on function public.inbound_author_id(text) to service_role;

comment on function public.inbound_author_id(text) is
	'Profil po e-mailu z auth.users. Tylko service_role (webhook inbound).';
