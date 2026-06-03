# Status implementacji vs PRD

**SSOT:** co jest zbudowane dziś, a co jest tylko w [PRD.md](../PRD.md) (kontrakt docelowy).

> PRD opisuje **docelowy produkt**. Rozjazdy z kodem są normalne w trakcie budowy — ten plik je śledzi. Po każdej fazie: zaktualizuj tabelę i checkboxy w PRD §10–§13.

Legenda: ✅ zaimplementowane · 🟡 częściowo · ⬜ planowane · 📋 tylko w PRD

---

## Fazy (skrót)

| Faza | PRD | Kod | Uwagi |
|------|-----|-----|--------|
| 1 — Auth, schema | ✅ | ✅ | |
| 2 — Edytor, Storage | ✅ | ✅ | Markdown textarea; TipTap 📋 |
| 3 — Admin CRUD, akceptacja | ✅ | ✅ | |
| 4 — Dispatcher WP + GitHub | 🟡 | 🟡 | WP + GitHub adapter ✅; retry UI ✅; staging Astro ⬜ |

---

## Funkcje szczegółowe

### Redaktor

| Wymaganie PRD | Status | Uwagi |
|---------------|--------|--------|
| Logowanie e-mail/hasło | ✅ | |
| Szkice, upload, submit → `pending` | ✅ | |
| Edycja tylko `draft` / `rejected` | ✅ | |
| TipTap / podgląd Markdown | 📋 | MVP = textarea (PRD §5.1) |
| Powiadomienia e-mail | 📋 | Poza MVP (PRD §0) |

### Administrator

| Wymaganie PRD | Status | Uwagi |
|---------------|--------|--------|
| CRUD `sites` | ✅ | `/admin/sites` + usuwanie gdy brak wpisów |
| CRUD `destinations` + credentials | ✅ | Create bez wymogu credentials; edycja dodaje tokeny |
| `site_destinations`, `user_sites` | ✅ | |
| Odrzucenie + `rejection_note` | ✅ | |
| Akceptacja + wybór destynacji | ✅ | |
| Semantyka `published` vs `publish_logs` | ✅ | approve → `publishing`; `published` po sukcesie workera |
| Cofnięcie WP / Astro z panelu | — | **Poza scope** — migracja: wyłączyć destynację WP, nie wysyłać nowych; stara strona WP poza OmniPress |
| MFA / Passkeys admin | 📋 | PRD §4.2 — przed Fazą 4 |
| Audit log akcji admina | 📋 | PRD §7 |

### Infrastruktura / bezpieczeństwo

| Wymaganie PRD | Status | Uwagi |
|---------------|--------|--------|
| RLS | ✅ | Testy integracyjne ⬜ (PRD §12) |
| `UNIQUE(site_id, slug)` | ✅ | Migracja Fazy 3 |
| Kolejka publikacji | ✅ | Worker + GitHub-Astro + retry ręczny |
| SEO staging / runbook DNS | 📋 | PRD §5.4.1 — runbook ⬜ |
| Storage public vs signed URL | 🟡 | Bucket publiczny; decyzja docs ⬜ |

---

## Migracje SQL (kolejność)

| Plik | Kiedy |
|------|--------|
| `20250603000000_initial_schema.sql` | Faza 1 — `setup:remote` |
| `20250604000000_storage_post_assets.sql` | Faza 2 — `npm run setup:storage` |
| `20250605000000_phase3_post_slug_unique.sql` | Faza 3 — `npm run setup:phase3` |
| `20250606000000_phase4_publish_worker.sql` | Faza 4 — `npm run setup:phase4` |

---

## Zmienne środowiskowe (stan)

| Zmienna | Wymagana | Status |
|---------|----------|--------|
| `SUPABASE_URL` / anon key | tak | Vercel ↔ Supabase |
| `ENCRYPTION_KEY` | destynacje prod | opcjonalna lokalnie |
| `CRON_SECRET` | worker cron | wymagana na Vercel prod |
| `SUPABASE_SERVICE_ROLE_KEY` | worker publish | nie w UI; wymagana na Vercel prod |

---

## Kiedy aktualizować ten plik

1. Po merge fazy (np. Faza 4).
2. Gdy PRD dostaje nową sekcję — najpierw PRD, potem tutaj wiersz ⬜.
3. Gdy zamykamy rozjazd — zmień 🟡/📋 na ✅ i dopisz datę w CHANGELOG.
