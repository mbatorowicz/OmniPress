# Wersjonowanie (SSOT)

## Źródła prawdy

| Co | SSOT | Przykład |
|----|------|----------|
| Wersja produktu (semver) | `package.json` → pole `version` | `0.1.0` |
| Tożsamość buildu (commit) | Git `HEAD` lub `VERCEL_GIT_COMMIT_SHA` | `d7f8740` |
| Etykieta w UI | Generowana przy `astro build` | `0.1.0+d7f8740` |

**Nie duplikuj** numeru wersji w plikach `.astro`, README ani dokumentacji — użyj `getBuildInfo()` z `src/config/app.ts`.

## Jak powstaje etykieta

1. `scripts/lib/git-info.mjs` — odczyt commita i semver.
2. `astro.config.mjs` — wstrzykuje `PUBLIC_APP_*` do bundla (Vite `define`).
3. `src/config/app.ts` — jedyny moduł aplikacji do odczytu w UI.

Format: **`{semver}+{commit}`** (standard metadanych buildu SemVer).

## Wyświetlanie

- Stopka panelu: `AppFooter.astro`
- Logowanie / strona główna: `VersionBadge.astro`
- Link commita → `https://github.com/mbatorowicz/OmniPress/commit/{sha}`

## Komendy

```bash
npm run version    # aktualna etykieta (lokalny git)
npm run build      # commit zapisany w artefakcie deployu
```

Na Vercel commit pochodzi z `VERCEL_GIT_COMMIT_SHA` (ten sam co wdrożenie).

## Zmiana wersji produktu

1. Edytuj tylko `package.json` → `version`.
2. Dopisz sekcję w `CHANGELOG.md`.
3. Commit + tag opcjonalnie: `git tag v0.1.0`.

Commit w etykiecie zmienia się **automatycznie** przy każdym buildzie.
