-- Faza 4: kolejka publikacji, retry, status publishing

DO $$ BEGIN
  ALTER TYPE public.post_status ADD VALUE 'publishing' AFTER 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.publish_log_status ADD VALUE 'processing' AFTER 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

alter table public.publish_logs
  add column if not exists retry_count int not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create trigger publish_logs_updated_at
  before update on public.publish_logs
  for each row execute function public.set_updated_at();

create index if not exists publish_logs_worker_idx
  on public.publish_logs (status, next_retry_at nulls first, created_at)
  where status in ('pending', 'failed');
