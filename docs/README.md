# Dokumentacja OmniPress (SSOT)

Jeden indeks — szczegóły tylko w docelowym dokumencie.

## Warstwy

| Warstwa | Plik | Rola |
|---------|------|------|
| **Stan produktu** | [STATUS.md](./STATUS.md) | Co jest zbudowane dziś |
| **Opis produktu** | [../PRD.md](../PRD.md) | Skrót modelu i workflow |
| **Operacyjne** | [ADMIN.md](./ADMIN.md), [REDAKTOR.md](./REDAKTOR.md) | Dla użytkowników panelu |
| **Techniczne** | [AUTH.md](./AUTH.md), [WDROZENIE.md](./WDROZENIE.md) | Dev / bootstrap |
| **Kod** | [KONWENCJE.md](./KONWENCJE.md), [ROLE_AGENT.md](./ROLE_AGENT.md) | Konwencje i proces agenta |
| **Jakość** | [AUDYT.md](./AUDYT.md), [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md) | Rejestr znalezisk i kroki naprawcze. **Kolejka:** a11y hamburgera (P1-18) — [następna sesja](./AUDYT-WYKONANIE.md#następna-sesja--a11y-hamburgera-po-16) |

## Indeks plików

| Dokument | SSOT dla |
|----------|----------|
| [STATUS.md](./STATUS.md) | **Implementacja** — funkcje, migracje, env |
| [../PRD.md](../PRD.md) | Opis produktu |
| [ADMIN.md](./ADMIN.md) | Panel administratora |
| [REDAKTOR.md](./REDAKTOR.md) | Panel redaktora |
| [AUTH.md](./AUTH.md) | Auth, sesja, endpointy |
| [WDROZENIE.md](./WDROZENIE.md) | Vercel, Supabase, migracje |
| [KONWENCJE.md](./KONWENCJE.md) | Kod, i18n, UI SSOT |
| [VERSIONING.md](./VERSIONING.md) | `semver+commit` |
| [AUDYT.md](./AUDYT.md) | Znaleziska audytu OmniPress ↔ repo Astro (co i dlaczego) |
| [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md) | Kroki naprawcze w podejściach (jak) |
| [ROLE_AGENT.md](./ROLE_AGENT.md) | Proces agenta AI |
| [../CHANGELOG.md](../CHANGELOG.md) | Historia wydań |
| [../README.md](../README.md) | Wejście do repo |

## SSOT techniczne (poza `docs/`)

| Ścieżka | SSOT dla |
|---------|----------|
| `package.json` | Wersja semver |
| `scripts/lib/git-info.mjs` | Etykieta `semver+commit` |
| `src/config/app.ts` | URL produkcji, origin auth |
| `src/i18n/pl/` | Napisy UI |
| `src/styles/ui.css` | Klasy UI |
| `supabase/migrations/` | Schemat bazy i RLS |

## Skrypty npm

| npm | Migracja / akcja |
|-----|-------------------|
| `setup:remote` | Bootstrap bazy + strona + admin |
| `setup:password` | Hasło administratora |
| `setup:auth-urls` | Site URL Supabase Auth |
| `setup:auth-mfa` | Włączenie MFA TOTP w Supabase Auth |
| `setup:storage` | Bucket assetów wpisów |
| `setup:storage-pdf` | PDF w bucket |
| `setup:storage-docx` | DOCX w bucket |
| `setup:storage-gpkg` | GPKG + limit 50 MB w bucket |
| `setup:storage-xlsx-zip` | XLSX + ZIP w bucket |
| `setup:storage-import-admin` | Import assetów z GitHub (admin) |
| `setup:asset-display` | Tryb wyświetlania assetów |
| `setup:asset-sort` | Kolejność galerii |
| `setup:assets-delete-own` | Usuwanie własnych assetów przez redaktora |
| `setup:assets-content-sha` | SHA256 treści assetów (deduplikacja) |
| `setup:phase3` | UNIQUE(site_id, slug) |
| `setup:phase4` | Worker publikacji |
| `setup:categories` | Kategorie wpisów |
| `setup:layout` | Layout Astro w bazie |
| `setup:remove-wordpress` | Usunięcie typu wordpress z enum |
| `setup:profiles-guard` | Trigger RLS — blokada eskalacji roli / site |
| `setup:scheduled-publish` | Data publikacji wpisu + status `scheduled` |
| `setup:site-pages` | Strony statyczne (admin) |
| `setup:author-on-delete` | Autor wpisu → NULL po usunięciu konta |
| `setup:posts-delete-own` | Usuwanie własnych wpisów przez redaktora |
| `setup:posts-rejected-resubmit` | Ponowne wysłanie odrzuconego wpisu |
| `setup:posts-pinned` | Przypinanie wpisu na stronie głównej |
| `setup:github-reconcile` | Auto-reconcile Omni ↔ GitHub (SHA HEAD + odciski treści) |
| `setup:fix-kgw-slug` | Korekta slug wpisu KGW (jednorazowa) |
| `setup:auth-rate-limits` | Rate limit auth (Upstash / RPC) |
| `seed:nav-pages` | Seed stron nawigacji (tylko baza) |
| `verify:auth-rate-limits` | Weryfikacja rate limitów auth |
| `verify:auth-mfa` | Weryfikacja MFA w Supabase |
| `env:pull` | Pobranie env z Vercel |
| `lint` | Bramka jakości: `typecheck`, ESLint TS, lint UI klas, spójność docs/setup, i18n, warstwy, rozmiar plików |
| `typecheck` | `tsc --noEmit` — całe repo, zero błędów |
| `lint:ui` | Tylko `scripts/lint-ui-classes.mjs` |
| `build:pdf-viewer` | Bundlowanie PDF viewer do `public/omnipress/` |
| `test` | Vitest (jednostkowe) |
| `test:e2e` | Playwright E2E/UI (domyślnie produkcja) |
| `build` | `build:pdf-viewer` + Astro production build |

## Zasada zmian

1. **Nowa funkcja** → zaktualizuj [STATUS.md](./STATUS.md) + [CHANGELOG.md](../CHANGELOG.md).
2. **Nowy flow panelu** → [ADMIN.md](./ADMIN.md) / [REDAKTOR.md](./REDAKTOR.md).
3. **Nowy tekst UI** → `src/i18n/pl/`.
4. **Auth / wdrożenie** → [AUTH.md](./AUTH.md) / [WDROZENIE.md](./WDROZENIE.md).
