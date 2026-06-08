-- Zaplanowana data publikacji (redaktor → akceptacja → kolejka do czasu)

DO $$ BEGIN
  ALTER TYPE public.post_status ADD VALUE 'scheduled' AFTER 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

alter table public.posts
  add column if not exists scheduled_publish_at timestamptz;

create index if not exists posts_scheduled_publish_idx
  on public.posts (scheduled_publish_at)
  where scheduled_publish_at is not null;
