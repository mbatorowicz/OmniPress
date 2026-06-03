# Dokumentacja OmniPress (SSOT)

Jeden indeks — **nie duplikuj** tych samych zasad w wielu plikach. Szczegóły tylko w docelowym dokumencie.

## Warstwy dokumentacji

| Warstwa | Plik | Rola |
|---------|------|------|
| **Kontrakt produktu** | [../PRD.md](../PRD.md) | Docelowy produkt — nie schodzi do „tylko to, co jest” |
| **Stan kodu** | [STATUS.md](./STATUS.md) | ✅ / 🟡 / ⬜ — śledzi implementację vs PRD |
| **Operacyjne** | [ADMIN.md](./ADMIN.md), [REDAKTOR.md](./REDAKTOR.md) | Dla ludzi w panelu |
| **Techniczne** | [AUTH.md](./AUTH.md), [WDROZENIE.md](./WDROZENIE.md) | Dev / bootstrap |
| **Proces** | [KONWENCJE.md](./KONWENCJE.md), [ROLE_AGENT.md](./ROLE_AGENT.md) | Kod i agent AI |

## Indeks plików

| Dokument | SSOT dla |
|----------|----------|
| [../PRD.md](../PRD.md) | Wymagania docelowe, fazy, model danych |
| [STATUS.md](./STATUS.md) | **Implementacja vs PRD** (aktualizuj po każdej fazie) |
| [ADMIN.md](./ADMIN.md) | Panel administratora |
| [REDAKTOR.md](./REDAKTOR.md) | Panel redaktora |
| [RUNBOOK-MIGRACJA.md](./RUNBOOK-MIGRACJA.md) | WP → Astro, SEO, DNS |
| [KONWENCJE.md](./KONWENCJE.md) | Kod, i18n, struktura plików |
| [ROLE_AGENT.md](./ROLE_AGENT.md) | Rola agenta AI |
| [PRD_AUDIT.md](./PRD_AUDIT.md) | Historia audytu PRD (2025-06) |
| [AUTH.md](./AUTH.md) | Auth, sesja, endpointy |
| [WDROZENIE.md](./WDROZENIE.md) | Vercel, Supabase, migracje |
| [VERSIONING.md](./VERSIONING.md) | `semver+commit` |
| [../CHANGELOG.md](../CHANGELOG.md) | Historia wydań |
| [../README.md](../README.md) | Wejście do repo |

## Inne SSOT (poza `docs/`)

| Ścieżka | SSOT dla |
|---------|----------|
| `package.json` | Wersja semver |
| `scripts/lib/git-info.mjs` | Etykieta `semver+commit` |
| `src/config/app.ts` | URL produkcji, origin auth |
| `src/i18n/pl/` | Napisy UI |
| `supabase/migrations/` | Schemat bazy i RLS |

## Skrypty (`scripts/`)

| Skrypt | npm | Opis |
|--------|-----|------|
| `setup-remote.mjs` | `setup:remote` | Bootstrap bazy, strona, admin |
| `set-admin-password.mjs` | `setup:password` | Hasło admina |
| `fix-auth-config.mjs` | `setup:auth-urls` | Site URL Supabase Auth |
| `apply-migration.mjs` | `setup:storage`, `setup:phase3`, `setup:phase4` | Migracje SQL |
| `lib/git-info.mjs` | (build) | Etykieta wersji |

## Zasada zmian

1. **Nowa funkcja docelowa** → PRD (+ ewentualnie PRD_AUDIT przy większej luce).
2. **Po merge fazy** → STATUS.md + CHANGELOG + checkboxy PRD §10–§13.
3. **Nowy tekst UI** → `src/i18n/pl/`.
4. **Zmiana auth / wdrożenia** → AUTH.md / WDROZENIE.md.
5. **Nowy flow admin/redaktor** → ADMIN.md / REDAKTOR.md.
