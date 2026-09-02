-- Auto-reconcile Omni ↔ GitHub: kursor HEAD + odciski treści stron i wpisów

alter table public.sites
  add column if not exists github_reconcile_sha text,
  add column if not exists github_reconciled_at timestamptz;

alter table public.site_pages
  add column if not exists live_blob_sha text,
  add column if not exists published_content_sha text;

alter table public.posts
  add column if not exists live_blob_sha text,
  add column if not exists published_content_sha text;
