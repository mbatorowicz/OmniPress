# Stan implementacji OmniPress

**SSOT:** co jest zbudowane w wersji **0.12.1** (kod + baza + panel).

Produkcja: https://omni-press.cncsolutions.dev

**Audyt migracji:** podejścia 1–18 zamknięte (2026-09-03). Szczegóły: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md).

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
| Administrator | `/login` | `/admin`, `/admin/posts`, `/admin/sites`, `/admin/units/*`, `/admin/users/*`, `/admin/posts/[id]` |

Nawigacja: nagłówek z przyciskami *Administracja* / *Panel treści*; sidebar (tylko `/admin/*`): Kolejka wpisów, Wszystkie wpisy, Strony, Użytkownicy. Stare `/admin/editors/*` przekierowuje (301) na `/admin/users/*`.

Reset hasła: `/login?mode=reset` → `/auth/reset-password`.

---

## Redaktor

| Funkcja | Status |
|---------|--------|
| Logowanie e-mail/hasło | ✅ |
| Przypisanie do stron (`user_sites`, `default_site_id`) | ✅ |
| Tworzenie szkicu na dozwolonej stronie | ✅ odświeżenie karty przywraca niewysłane pola |
| Edytor WYSIWYG (TipTap) → Markdown | ✅ jeden renderer Markdown + ten sam odstęp akapitów w edytorze, podglądzie i na stronie |
| Kategoria główna + dodatkowe (np. Aktualności → strona główna) | ✅ |
| Galeria zdjęć (cover + kolejność) | ✅ miniatura i postęp uploadu od razu |
| Załączniki PDF (link / podgląd, do 50 MB) | ✅ signed upload → Supabase Storage |
| Załączniki DOCX (link, do 50 MB) | ✅ |
| Pliki do pobrania (GPKG / XLSX / ZIP, do 50 MB) | ✅ `setup:storage-xlsx-zip` |
| Zapis szkicu, wysłanie do akceptacji | ✅ |
| Data publikacji + godzina z listy 6:00–20:00 (czas polski); bez daty = publikacja w momencie wysłania | ✅ na stronie zostaje data pierwszej publikacji (poprawka jej nie zmienia) |
| Usuwanie własnych wpisów (`draft` / `rejected`) wraz z plikami Storage | ✅ migracja `setup:posts-delete-own` |
| Edycja tylko `draft` / `rejected`; poprawki opublikowanych (amendment) | ✅ (administrator poprawia także `pending` / `scheduled`) |
| Podgląd treści po wysłaniu / odrzuceniu | ✅ |
| Lista własnych wpisów: filtr (tytuł, status, strona), sortowanie (domyślnie data publikacji), stronicowanie po 25 | ✅ `/dashboard` |
| Instrukcja w panelu (`/dashboard/help`) | ✅ | link *Pomoc* w nagłówku + *Instrukcja* na liście wpisów |

---

## Administrator

| Funkcja | Status |
|---------|--------|
| Strony (jednostki) — strona + GitHub w jednym formularzu | ✅ `/admin/units/new`, `/admin/units/[id]` |
| Lista stron jako kafelki + kafelek „+ Dodaj stronę” | ✅ `/admin/sites` |
| Użytkownicy: admini + redaktorzy (tworzenie z rolą, ustawienia konta, hasło, usuwanie) | ✅ `/admin/users`, `/admin/users/[id]` |
| Uprawnienia redaktora (strony + domyślna); blokada: własne konto / ostatni admin | ✅ |
| Usunięcie konta zostawia wpisy (autor: „konto usunięte”) | ✅ migracja `setup:author-on-delete` |
| Kolejka: do akceptacji, zaplanowane (ze znacznikiem „Publikacja…”), na stronie | ✅ `/admin` |
| Wszystkie wpisy redaktorów — także szkice i wpisy do poprawki; zakładki statusów z licznikami, filtr (tytuł, status, strona, autor), sortowanie kolumn (domyślnie data publikacji), stronicowanie po 25 | ✅ `/admin/posts` |
| Akceptacja → kolejka publikacji GitHub (natychmiast lub o zaplanowanej godzinie) | ✅ |
| Publikacja szkicu / wpisu do poprawki bez czekania na redaktora (`draft`, `rejected`, `pending`) | ✅ blokada, gdy brak tytułu lub kategorii |
| Wysłanie cudzego wpisu do akceptacji (pełna ścieżka redaktora) | ✅ `/admin/posts/[id]/edit` |
| Odrzucenie z `rejection_note` | ✅ tylko `pending` |
| Korekta wpisu przed publikacją (`draft`, `rejected`, `pending`, `scheduled`) — treść, tytuł, slug, kategoria główna i dodatkowe, data, tryb załącznika (link / podgląd), galeria | ✅ `/admin/posts/[id]/edit` |
| Ponowne otwarcie wpisu (reopen) | ✅ |
| Dezaktywacja / usunięcie opublikowanego (withdraw z GitHub) | ✅ |
| Bulk: akceptacja / odrzucenie (pending), anulowanie harmonogramu, dezaktywacja / usuwanie | ✅ |
| Przypinanie wpisu na stronie głównej (`pinned`) | ✅ migracja `setup:posts-pinned` |
| Import wpisów z GitHub | ✅ auto przy wejściu na panel (bez przycisku) |
| Layout Astro (menu, kategorie, sloty) + sync do repo | ✅ menu `/navigation`; kategorie `/posts` (publikacja listy na live); sloty `/components` |
| Ustawienia strony (nazwa, slug, GitHub, tokeny) | ✅ `/admin/units/[id]` |
| Strony statyczne (admin) + publikacja do repo Astro | ✅ `/admin/units/[id]/pages` — auto-pull z GitHub, publikacja nie nadpisze pustką |
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

1. Admin akceptuje wpis (`draft`, `rejected` lub `pending`) → `publish_logs.pending` (z `next_retry_at` = data redaktora, jeśli w przyszłości). Szkic bez daty dostaje datę akceptacji.
2. Status `scheduled` (czeka) lub `publishing` (od razu). Worker `/api/worker/publish`: start po akceptacji natychmiastowej, przy wejściu admina na `/admin`, oraz cron Vercel (plan Hobby: raz dziennie 06:00 UTC; docelowo co godzinę na Pro).
3. **Atomowy commit** na GitHub (layout `flat` lub `folder`): tylko zmienione załączniki (SHA) + `index.md` + rejestr ostatnich zmian (+ PDF viewer / sprzątanie orphanów i starego folderu) — jeden deploy Vercel; bez zmian → bez commita.
4. Opcjonalnie: weryfikacja deployu Vercel (niepowodzenie nie wywołuje ponownego uploadu).
5. Sukces → `published`; błąd GitHub → `failed` (retry automatyczny + przycisk w UI).

Withdraw/deactivate: batch delete plików wpisu z GitHub (jeden commit; listing folderu zamiast całego tree).

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
| `20250622000000_storage_post_assets_docx.sql` | `setup:storage-docx` |
| `20250623000000_storage_post_assets_gpkg.sql` | `setup:storage-gpkg` |
| `20250719000000_storage_post_assets_xlsx_zip.sql` | `setup:storage-xlsx-zip` |
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
| `20250621000000_fix_kgw_post_slug.sql` | `setup:fix-kgw-slug` |
| `20250707000000_auth_rate_limits.sql` | `setup:auth-rate-limits` |
| `20250718000000_assets_content_sha.sql` | `setup:assets-content-sha` |
| `20250827000000_posts_pinned.sql` | `setup:posts-pinned` |
| `20250902000000_github_reconcile.sql` | `setup:github-reconcile` |
| `20250906000000_post_extra_categories.sql` | `setup:extra-categories` |

Tabela opisuje **zamierzony** stan bazy. `lint-docs-setup.mjs` pilnuje zgodności `package.json` ↔ ta tabela, ale nie sprawdza produkcji — w audycie P0-7 okazało się, że jedna migracja nigdy tam nie trafiła. Przy wątpliwościach: porównaj z bazą (triggery, polityki, kolumny), nie z tym dokumentem.

---

## Bezpieczeństwo

| Warstwa | Status |
|---------|--------|
| RLS trigger `profiles` (role, default_site_id) | ✅ migracja `setup:profiles-guard` — zastosowana na produkcji 2026-08-27 (audyt P0-7), pokryta testem RLS |
| Wyłączenie public signup (Supabase) | ✅ `setup:auth-urls` |
| MFA TOTP (admin, AAL2) | ✅ `/auth/mfa/setup`, `/auth/mfa` |
| CSP z nonce (panel SSR) | ✅ middleware + `src/lib/security/headers.ts` |
| Rate limit auth (Upstash Redis lub Supabase RPC) | ✅ `setup:auth-rate-limits` |
| Origin check (auth POST) | ✅ |
| Nagłówki HTTP (HSTS, X-Frame-Options, …) | ✅ middleware |
| Fine-grained GitHub PAT (audyt przy teście kanału) | ✅ |
| Upload: magic bytes | ✅ |
| Anti-enumeracja resetu hasła | ✅ |
| Sanityzacja treści (edytor + zapis + publikacja) | ✅ |

---

## Testy

| Warstwa | Narzędzie | Zakres |
|---------|-----------|--------|
| Jednostkowe (`npm test`) | Vitest | logika `lib/` — 120 plików testowych obok modułów (836 testy + 22 RLS opt-in) |
| Typy (`npm run typecheck`) | `tsc --noEmit` | całe repo, zero błędów; wpięte w `npm run lint` jako bramka |
| Integracyjne RLS (opt-in) | Vitest + `pg` | `src/lib/supabase/rls.integration.test.ts` — 22 przypadki: izolacja redaktorów, dane wrażliwe, eskalacja uprawnień |
| E2E/UI (`npm run test:e2e`) | Playwright (`e2e/`) | produkcja: strefa publiczna, nagłówki bezpieczeństwa, CSRF, auth (logowanie/wylogowanie, błędne hasło), panel admina, lista wpisów z filtrami (`posts-browse.spec.ts`), cykl wpisu (szkic → walidacja → zapis → usunięcie) |

E2E domyślnie biegnie na produkcji (`E2E_BASE_URL` zmienia cel); dane logowania: `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` lub lokalny `.admin-password.txt`.

Testy RLS wymagają `RLS_TEST_DATABASE_URL` (`.env.local` lub zmienna środowiskowa) — bez niej `npm test` je pomija, żeby nie łączyć się z produkcją przypadkiem. Cała sesja biegnie w transakcji zakończonej `ROLLBACK`; baza zostaje bez zmian.

Wspólne narzędzia testowe: `src/lib/testing/supabase-fake.ts` (klient Supabase z rejestrem zapytań) i `src/lib/testing/fetch-fake.ts` (router `fetch`).

---

## Zmienne środowiskowe (Vercel prod)

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `SUPABASE_URL`, anon key | tak | Integracja Vercel ↔ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | tak (worker) | Worker publikacji — nie w UI |
| `CRON_SECRET` | tak (worker) | Autoryzacja cron → `/api/worker/publish` |
| `ENCRYPTION_KEY` | tak (credentials) | Szyfrowanie tokenów GitHub/Vercel w bazie |
| `VERCEL_TOKEN` | opcjonalnie | Globalny token do weryfikacji buildów (alternatywa: per destynacja) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | opcjonalnie (prod zalecane) | Współdzielony rate limit auth między instancjami Vercel |

---

## Nie zaimplementowane (planowane)

| Funkcja | Uwagi |
|---------|--------|
| Powiadomienia e-mail (akceptacja/odrzucenie) | — |
| Passkeys dla admina | — |
| Audit log akcji administratora | — |
| SSO redaktorów | — |

---

## 0.12.0 — Dodatkowe kategorie wpisu

- Wpis ma **jedną kategorię główną** (adres `/{kategoria}/{slug}`) i opcjonalnie dodatkowe.
- Przykład: główna *Mazowsze bez smogu*, dodatkowa *Aktualności* — wpis jest też na stronie głównej i w archiwum Aktualności.
- Migracja `setup:extra-categories`. Front-matter: opcjonalne `categories`.

## 0.11.0 — Auto-reconcile Omni ↔ GitHub

- Przy wejściu na panel Omni sam wczytuje wpisy, strony statyczne i layout z `origin/main`, gdy GitHub się zmienił i nie ma niewysłanych poprawek w Omni.
- Publikacja strony odmawia pustki/placeholdera nad bogatszą treścią w repo.
- *Utwórz strony z menu* tworzy tylko szkice — nic nie idzie do Gita.
- Przyciski *Importuj z GitHub* usunięte. Migracja `setup:github-reconcile`.

## 0.10.0 — SSOT stylów UI

- Semantyczne tokeny w `src/styles/global.css` (`text`, `border`, `link`, `danger`, nav depth itd.).
- Partiale `ui/*.css` bez surowych `slate-*`; nowe: `typography.css`, `rich-content.css`, `layout-slots-preview.css`.
- Warianty przycisków: `ui-btn--link`, `ui-btn--link-danger`, `ui-btn--link-ghost`, `ui-btn--sm`.
- Migracja komponentów domenowych na klasy `ui-*`; linki w treści = kolor brand.
- PDF viewer i callback auth na tokenach CSS / `AuthLayout`.
- Lint: `npm run lint` — `tsc --noEmit`, ESLint TS oraz linty `scripts/lint-{ui-classes,docs-setup,i18n,layers,file-size}.mjs`; workflow CI `.github/workflows/ci.yml`.

---

## Powiązane dokumenty

- [ADMIN.md](./ADMIN.md) — jak używać panelu admina
- [REDAKTOR.md](./REDAKTOR.md) — jak używać panelu redaktora
- [WDROZENIE.md](./WDROZENIE.md) — bootstrap techniczny
- [../PRD.md](../PRD.md) — opis produktu (skrót)
