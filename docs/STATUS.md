# Stan implementacji OmniPress

**SSOT:** co jest zbudowane w wersji **0.7.13** (kod + baza + panel).

Produkcja: https://omni-press.vercel.app

---

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Aplikacja | Astro 6 SSR, Tailwind CSS v4 |
| Hosting | Vercel (`@astrojs/vercel`, cron worker) |
| Baza + Auth | Supabase (PostgreSQL, RLS, Auth, Storage) |
| Edytor | TipTap → zapis jako Markdown |
| Publikacja | GitHub API → repo Astro → opcjonalnie deploy Vercel |

Jedyny typ destynacji: **`github_astro`**.

---

## Role i trasy

| Rola | Logowanie | Panel |
|------|-----------|-------|
| Redaktor | `/login` | `/dashboard`, `/dashboard/posts/[id]` |
| Administrator | `/login` | `/admin`, `/admin/sites`, `/admin/units/*`, `/admin/editors/*`, `/admin/posts/[id]` |

Reset hasła: `/login?mode=reset` → `/auth/reset-password`.

---

## Redaktor

| Funkcja | Status |
|---------|--------|
| Logowanie e-mail/hasło | ✅ |
| Przypisanie do stron (`user_sites`, `default_site_id`) | ✅ |
| Tworzenie szkicu na dozwolonej stronie | ✅ |
| Edytor WYSIWYG (TipTap) → Markdown | ✅ |
| Kategoria wpisu (z pliku w repo Astro) | ✅ |
| Galeria zdjęć (cover + kolejność) | ✅ |
| Załączniki PDF (link / podgląd) | ✅ |
| Zapis szkicu, wysłanie do akceptacji | ✅ |
| Edycja tylko `draft` / `rejected`; poprawki opublikowanych (amendment) | ✅ |
| Podgląd treści po wysłaniu / odrzuceniu | ✅ |

---

## Administrator

| Funkcja | Status |
|---------|--------|
| Jednostki organizacyjne (strona + GitHub w jednym formularzu) | ✅ `/admin/units/new`, `/admin/units/[id]` |
| Lista stron | ✅ `/admin/sites` |
| Redaktorzy + przypisanie stron | ✅ `/admin/editors` |
| Kolejka: do akceptacji, publikacja w toku, opublikowane | ✅ `/admin` |
| Akceptacja → kolejka publikacji GitHub | ✅ |
| Odrzucenie z `rejection_note` | ✅ |
| Ponowne otwarcie wpisu (reopen) | ✅ |
| Dezaktywacja / usunięcie opublikowanego (withdraw z GitHub) | ✅ |
| Bulk dezaktywacja / usuwanie opublikowanych | ✅ |
| Import wpisów z GitHub | ✅ |
| Layout Astro (menu, kategorie, sloty) + sync do repo | ✅ `/admin/units/[id]/layout` |
| Ostatnie zmiany (ogłoszenia) | ✅ `/admin/units/[id]/changes` |
| Test połączenia GitHub | ✅ |
| Logi publikacji + retry ręczny | ✅ |
| Weryfikacja logów buildu Vercel po publikacji | ✅ (opcjonalnie token / project id) |
| Usuwanie jednostki (gdy brak wpisów) | ✅ |

---

## Publikacja (worker)

1. Admin akceptuje wpis → status `publishing`, `publish_logs.pending`.
2. Worker `/api/worker/publish` (cron dzienny + start po akceptacji).
3. Commit `.md` + assety do repo GitHub (layout `flat` lub `folder`).
4. Opcjonalnie: oczekiwanie na deploy Vercel i zapis błędów buildu.
5. Sukces → `published`; błąd → `failed` (retry automatyczny + przycisk w UI).

Withdraw/deactivate: batch delete plików wpisu z GitHub.

---

## Migracje SQL (kolejność)

| Plik | npm |
|------|-----|
| `20250603000000_initial_schema.sql` | `setup:remote` |
| `20250604000000_storage_post_assets.sql` | `setup:storage` |
| `20250605000000_phase3_post_slug_unique.sql` | `setup:phase3` |
| `20250606000000_phase4_publish_worker.sql` | `setup:phase4` |
| `20250607000000_post_categories.sql` | `setup:categories` |
| `20250608000000_site_astro_layout.sql` | `setup:layout` |
| `20250609000000_storage_post_assets_pdf.sql` | `setup:storage-pdf` |
| `20250610000000_asset_display_mode.sql` | `setup:asset-display` |
| `20250611000000_asset_sort_order.sql` | `setup:asset-sort` |
| `20250612000000_remove_wordpress.sql` | `setup:remove-wordpress` |

---

## Zmienne środowiskowe (Vercel prod)

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `SUPABASE_URL`, anon key | tak | Integracja Vercel ↔ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | tak (worker) | Worker publikacji — nie w UI |
| `CRON_SECRET` | tak (worker) | Autoryzacja cron → `/api/worker/publish` |
| `ENCRYPTION_KEY` | tak (credentials) | Szyfrowanie tokenów GitHub/Vercel w bazie |
| `VERCEL_TOKEN` | opcjonalnie | Globalny token do weryfikacji buildów (alternatywa: per destynacja) |

---

## Nie zaimplementowane (planowane)

| Funkcja | Uwagi |
|---------|--------|
| Powiadomienia e-mail (akceptacja/odrzucenie) | — |
| MFA / Passkeys dla admina | — |
| Audit log akcji administratora | — |
| Testy integracyjne RLS | — |
| SSO redaktorów | — |

---

## Powiązane dokumenty

- [ADMIN.md](./ADMIN.md) — jak używać panelu admina
- [REDAKTOR.md](./REDAKTOR.md) — jak używać panelu redaktora
- [WDROZENIE.md](./WDROZENIE.md) — bootstrap techniczny
- [../PRD.md](../PRD.md) — opis produktu (skrót)
