# OmniPress

Headless CMS do przygotowania treści przez redaktorów i publikacji na stronach **Astro** (GitHub + Vercel).

**Produkcja:** https://omni-press.cncsolutions.dev

## Dokumentacja

| Dokument | Opis |
|----------|------|
| [docs/README.md](./docs/README.md) | Indeks dokumentacji |
| [docs/STATUS.md](./docs/STATUS.md) | **Stan implementacji (SSOT)** |
| [PRD.md](./PRD.md) | Opis produktu |
| [docs/ADMIN.md](./docs/ADMIN.md) | Podręcznik administratora |
| [docs/REDAKTOR.md](./docs/REDAKTOR.md) | Podręcznik redaktora |
| [docs/WDROZENIE.md](./docs/WDROZENIE.md) | Bootstrap (Vercel, Supabase, migracje) |
| [docs/AUTH.md](./docs/AUTH.md) | Autoryzacja |
| [docs/KONWENCJE.md](./docs/KONWENCJE.md) | Konwencje kodu i i18n |

## Stack

- Astro 6 SSR + Tailwind CSS v4
- Supabase (Auth, PostgreSQL, RLS, Storage)
- Deploy: Vercel (`@astrojs/vercel`)
- Publikacja: GitHub → repo Astro

## Wdrożenie

Instrukcja krok po kroku: [docs/WDROZENIE.md](./docs/WDROZENIE.md)

Integracja Vercel ↔ Supabase: **pusty** Custom Prefix. Kod mapuje `SUPABASE_URL` / `SUPABASE_ANON_KEY` automatycznie.

### Lokalnie

```bash
cp .env.example .env
# uzupełnij PUBLIC_SUPABASE_URL i PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

http://localhost:4321

## Wersja

Etykieta **`semver+commit`** (np. `0.7.13+abc1234`). Szczegóły: [docs/VERSIONING.md](./docs/VERSIONING.md) · `npm run version`

## Struktura repo

```
src/
  config/        — URL, build
  i18n/pl/       — napisy UI (SSOT tekstów)
  lib/           — logika (auth, posts, admin, publish)
  components/    — UI (ui/, admin/, posts/)
  pages/         — trasy + API
scripts/         — bootstrap, migracje
supabase/        — migracje SQL
docs/            — dokumentacja operacyjna i techniczna
```
