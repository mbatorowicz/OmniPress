-- Intent inbound: podmiana / pytanie. post_id puste przy clarify.

alter table public.inbound_messages
	alter column post_id drop not null;

alter table public.inbound_messages
	add column if not exists page_id uuid references public.site_pages (id) on delete set null;

alter table public.inbound_messages
	add column if not exists status text not null default 'drafted';

alter table public.inbound_messages
	drop constraint if exists inbound_messages_status_check;

alter table public.inbound_messages
	add constraint inbound_messages_status_check
	check (status in ('drafted', 'replaced', 'awaiting_clarification'));

alter table public.inbound_messages
	add column if not exists source_message_id text;

comment on column public.inbound_messages.status is
	'Wynik ingestu: szkic, podmiana albo pytanie do allowlisty.';

comment on column public.inbound_messages.page_id is
	'Strona stala przy intent replace; puste przy szkicu wpisu.';
