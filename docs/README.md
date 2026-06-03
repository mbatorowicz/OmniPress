# Dokumentacja OmniPress (SSOT)

Jeden indeks — **nie duplikuj** tych samych zasad w wielu plikach. Szczegóły tylko w docelowym dokumencie.

| Dokument | SSOT dla |
|----------|----------|
| [../PRD.md](../PRD.md) | Wymagania produktowe, fazy, model danych |
| [KONWENCJE.md](./KONWENCJE.md) | Kod, i18n, struktura plików, limity |
| [ROLE_AGENT.md](./ROLE_AGENT.md) | Rola agenta AI (Tech Lead + PM, autonomia, CLI) |
| [PRD_AUDIT.md](./PRD_AUDIT.md) | Audyt PRD — luki, bezpieczeństwo, rekomendacje |
| [AUTH.md](./AUTH.md) | Przepływy auth, endpointy, ciasteczka |
| [WDROZENIE.md](./WDROZENIE.md) | Vercel, Supabase, bootstrap |
| [VERSIONING.md](./VERSIONING.md) | `semver+commit`, build |
| [../CHANGELOG.md](../CHANGELOG.md) | Historia wydań |
| [../README.md](../README.md) | Wejście do repo (linkuje tutaj) |

## Inne SSOT (poza `docs/`)

| Ścieżka | SSOT dla |
|---------|----------|
| `package.json` | Wersja semver |
| `scripts/lib/git-info.mjs` | Etykieta `semver+commit` |
| `src/config/app.ts` | URL produkcji, origin auth (nie teksty UI) |
| `src/i18n/pl/` | **Wszystkie napisy UI** (język polski) |
| `supabase/migrations/` | Schemat bazy i RLS |

## Zasada zmian

1. Nowa funkcja → najpierw PRD / faza, potem kod zgodny z [KONWENCJE.md](./KONWENCJE.md).
2. Nowy tekst UI → tylko `src/i18n/pl/*.ts`, nigdy na sztywno w `.astro` / API.
3. Zmiana auth → [AUTH.md](./AUTH.md) + kod w `src/lib/auth/`, `src/middleware.ts`.
