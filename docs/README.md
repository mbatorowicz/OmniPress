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
| `setup:storage` | Bucket assetów wpisów |
| `setup:storage-pdf` | PDF w bucket |
| `setup:storage-docx` | DOCX w bucket |
| `setup:storage-gpkg` | GPKG + limit 50 MB w bucket |
| `setup:storage-xlsx-zip` | XLSX + ZIP w bucket |
| `setup:asset-display` | Tryb wyświetlania assetów |
| `setup:asset-sort` | Kolejność galerii |
| `setup:phase3` | UNIQUE(site_id, slug) |
| `setup:phase4` | Worker publikacji |
| `setup:categories` | Kategorie wpisów |
| `setup:layout` | Layout Astro w bazie |
| `setup:remove-wordpress` | Usunięcie typu wordpress z enum |
| `setup:profiles-guard` | Trigger RLS — blokada eskalacji roli / site |
| `setup:scheduled-publish` | Data publikacji wpisu + status `scheduled` |
| `setup:site-pages` | Strony statyczne (admin) |
| `setup:posts-delete-own` | Usuwanie własnych wpisów przez redaktora |
| `env:pull` | Pobranie env z Vercel |
| `test` | Vitest (jednostkowe) |
| `test:e2e` | Playwright E2E/UI (domyślnie produkcja) |
| `build` | Astro production build |

## Zasada zmian

1. **Nowa funkcja** → zaktualizuj [STATUS.md](./STATUS.md) + [CHANGELOG.md](../CHANGELOG.md).
2. **Nowy flow panelu** → [ADMIN.md](./ADMIN.md) / [REDAKTOR.md](./REDAKTOR.md).
3. **Nowy tekst UI** → `src/i18n/pl/`.
4. **Auth / wdrożenie** → [AUTH.md](./AUTH.md) / [WDROZENIE.md](./WDROZENIE.md).
