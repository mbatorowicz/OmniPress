# Stan implementacji OmniPress

**SSOT:** co jest zbudowane w wersji **0.9.0** (kod + baza + panel).

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
| Administrator | `/login` | `/admin`, `/admin/sites`, `/admin/units/*`, `/admin/users/*`, `/admin/posts/[id]` |

Nawigacja: nagłówek z przyciskami *Administracja* / *Panel treści*; sidebar (tylko `/admin/*`): Kolejka wpisów, Strony, Użytkownicy. Stare `/admin/editors/*` przekierowuje (301) na `/admin/users/*`.

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
| Data publikacji + godzina z listy 6:00–20:00 (czas polski); bez daty = publikacja w momencie wysłania | ✅ |
| Usuwanie własnych wpisów (`draft` / `rejected`) wraz z plikami Storage | ✅ migracja `setup:posts-delete-own` |
| Edycja tylko `draft` / `rejected`; poprawki opublikowanych (amendment) | ✅ |
| Podgląd treści po wysłaniu / odrzuceniu | ✅ |

---

## Administrator

| Funkcja | Status |
|---------|--------|
| Strony (jednostki) — strona + GitHub w jednym formularzu | ✅ `/admin/units/new`, `/admin/units/[id]` |
| Lista stron jako kafelki + kafelek „+ Dodaj stronę” | ✅ `/admin/sites` |
| Użytkownicy: admini + redaktorzy (tworzenie z rolą, ustawienia konta, hasło, usuwanie) | ✅ `/admin/users`, `/admin/users/[id]` |
| Uprawnienia redaktora (strony + domyślna); blokada: własne konto / ostatni admin | ✅ |
| Usunięcie konta zostawia wpisy (autor: „konto usunięte”) | ✅ migracja `setup:author-on-delete` |
| Kolejka: do akceptacji, zaplanowane (ze znacznikiem „W toku”), opublikowane | ✅ `/admin` |
| Akceptacja → kolejka publikacji GitHub (natychmiast lub o zaplanowanej godzinie) | ✅ |
| Odrzucenie z `rejection_note` | ✅ |
| Ponowne otwarcie wpisu (reopen) | ✅ |
| Dezaktywacja / usunięcie opublikowanego (withdraw z GitHub) | ✅ |
| Bulk dezaktywacja / usuwanie opublikowanych | ✅ |
| Import wpisów z GitHub | ✅ |
| Layout Astro (menu, kategorie, sloty) + sync do repo | ✅ `/admin/units/[id]/layout` |
| Strony statyczne (admin) + publikacja do repo Astro | ✅ `/admin/units/[id]/pages` |
| Walidacja linków menu przed sync GitHub | ✅ |
| Ostatnie zmiany (ogłoszenia) | ✅ `/admin/units/[id]/changes` |
| Komunikaty CERT Polska (RSS → live API na stronie Astro) | ✅ Slot `sidebar.cert_advisories`; endpoint `/api/cert/advisories` na stronie jednostki (cache 15 min) |
| Ostrzeżenia pogodowe IMGW (osmet-teryt → live API na stronie Astro) | ✅ Slot `sidebar.weather`; endpoint `/api/weather/warnings` na stronie jednostki (cache 15 min) — OmniPress tylko konfiguruje slot |
| Test połączenia GitHub | ✅ |
| Logi publikacji + retry ręczny | ✅ |
| Weryfikacja logów buildu Vercel po publikacji | ✅ (opcjonalnie token / project id) |
| Usuwanie jednostki (gdy brak wpisów) | ✅ |

---

## Publikacja (worker)

1. Admin akceptuje wpis → `publish_logs.pending` (z `next_retry_at` = data redaktora, jeśli w przyszłości).
2. Status `scheduled` (czeka) lub `publishing` (od razu). Worker `/api/worker/publish`: start po akceptacji natychmiastowej, przy wejściu admina na `/admin`, oraz cron Vercel (plan Hobby: raz dziennie 06:00 UTC; docelowo co godzinę na Pro).
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
| `20250613000000_profiles_self_update_guard.sql` | `setup:profiles-guard` |
| `20250614000000_post_scheduled_publish.sql` | `setup:scheduled-publish` |
| `20250615000000_site_pages.sql` | `setup:site-pages` |
| `20250616000000_storage_import_admin.sql` | `setup:storage-import-admin` |
| `20250617000000_author_on_delete_set_null.sql` | `setup:author-on-delete` |
| `20250618000000_posts_delete_own.sql` | `setup:posts-delete-own` |
| `20250619000000_posts_rejected_resubmit.sql` | `setup:posts-rejected-resubmit` |
| `20250620000000_assets_delete_own.sql` | `setup:assets-delete-own` |

---

## Bezpieczeństwo (0.7.16)

| Warstwa | Status |
|---------|--------|
| RLS trigger `profiles` (role, default_site_id) | ✅ migracja `setup:profiles-guard` |
| Wyłączenie public signup (Supabase) | ✅ `setup:auth-urls` |
| Rate limit + Origin check (auth POST) | ✅ |
| Nagłówki HTTP (HSTS, X-Frame-Options, …) | ✅ middleware |
| Upload: magic bytes | ✅ |
| Anti-enumeracja resetu hasła | ✅ |
| Sanityzacja treści (edytor + zapis + publikacja) | ✅ |

---

## Testy

| Warstwa | Narzędzie | Zakres |
|---------|-----------|--------|
| Jednostkowe (`npm test`) | Vitest | logika `lib/` — 42 pliki obok modułów |
| E2E/UI (`npm run test:e2e`) | Playwright (`e2e/`) | produkcja: strefa publiczna, nagłówki bezpieczeństwa, CSRF, auth (logowanie/wylogowanie, błędne hasło), panel admina, cykl wpisu (szkic → walidacja → zapis → usunięcie) |

E2E domyślnie biegnie na produkcji (`E2E_BASE_URL` zmienia cel); dane logowania: `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` lub lokalny `.admin-password.txt`.

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
