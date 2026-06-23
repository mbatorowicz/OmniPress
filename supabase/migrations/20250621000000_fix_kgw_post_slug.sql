-- Naprawa rozjazdu slug / external_id po publikacji wpisu KGW do folderu test/.
-- Docelowy folder: mozliwosci-finansowania-projektow-realizowanych-przez-kgw

update public.posts
set slug = 'mozliwosci-finansowania-projektow-realizowanych-przez-kgw',
    updated_at = now()
where slug = 'test'
  and title ilike '%KGW%';

update public.posts
set slug = 'mozliwosci-finansowania-projektow-realizowanych-przez-kgw',
    updated_at = now()
where id = '0a73663b-9ad3-4dcc-923a-4f269add3390'
  and slug is distinct from 'mozliwosci-finansowania-projektow-realizowanych-przez-kgw';

update public.publish_logs
set external_id = 'github:src/content/news/mozliwosci-finansowania-projektow-realizowanych-przez-kgw/index.md',
    updated_at = now()
where external_id = 'github:src/content/news/test/index.md';

update public.publish_logs
set external_id = 'github:src/content/news/mozliwosci-finansowania-projektow-realizowanych-przez-kgw/index.md',
    updated_at = now()
where post_id = '0a73663b-9ad3-4dcc-923a-4f269add3390'
  and status = 'success'
  and external_id is distinct from 'github:src/content/news/mozliwosci-finansowania-projektow-realizowanych-przez-kgw/index.md';
