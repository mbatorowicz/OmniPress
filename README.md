# OmniPress

Headless CMS do przygotowania treści przez redaktorów i publikacji na wielu platformach (WordPress, Astro/GitHub) z jednego panelu.

- Wymagania produktowe: [PRD.md](./PRD.md)
- **Indeks dokumentacji (SSOT):** [docs/README.md](./docs/README.md)
- Konwencje kodu i i18n: [docs/KONWENCJE.md](./docs/KONWENCJE.md)
- Rola agenta / Tech Lead: [docs/ROLE_AGENT.md](./docs/ROLE_AGENT.md)
- Audyt PRD: [docs/PRD_AUDIT.md](./docs/PRD_AUDIT.md)
- Autoryzacja: [docs/AUTH.md](./docs/AUTH.md)
- Schemat bazy: [supabase/migrations/20250603000000_initial_schema.sql](./supabase/migrations/20250603000000_initial_schema.sql)

## Stack (Faza 1)

- Astro 6 SSR + Tailwind CSS v4
- Supabase (Auth, PostgreSQL, RLS)
- Deploy: Vercel (`@astrojs/vercel`)

## Wdrożenie (dla Ciebie)

**Prosta instrukcja krok po kroku:** [docs/WDROZENIE.md](./docs/WDROZENIE.md)

Integracja Vercel ↔ Supabase: zostaw **pusty** Custom Prefix. Kod sam mapuje `SUPABASE_URL` / `SUPABASE_ANON_KEY` — nie trzeba ręcznie tworzyć `PUBLIC_*` w panelu Vercel.

### Lokalnie (opcjonalnie)

```bash
cp .env.example .env
# uzupełnij PUBLIC_SUPABASE_URL i PUBLIC_SUPABASE_ANON_KEY z Supabase → Settings → API

npm install
npm run dev
```

Aplikacja: http://localhost:4321

## Wersja

Etykieta **`semver+commit`** (np. `0.1.0+d7f8740`) — semver z `package.json`, commit z Gita/Vercel.  
Szczegóły: [docs/VERSIONING.md](./docs/VERSIONING.md) · `npm run version`

## Struktura

```
src/
  config/        — URL, build (bez tekstów UI)
  i18n/pl/       — SSOT napisów (polski)
  components/    — UI (stopka, badge wersji)
  layouts/       — AppLayout
  lib/           — Supabase, auth, typy
  pages/         — trasy Astro (cienkie)
scripts/lib/     — git-info.mjs (SSOT commit przy buildzie)
supabase/        — migracje SQL
docs/            — indeks SSOT, konwencje, wdrożenie
```

## Kamienie milowe

| Faza | Status |
|------|--------|
| 1 — Auth, schema, szkielet | ✅ |
| 2 — Edytor, szkice, Storage | ✅ |
| 3 — CRUD stron/destynacji, akceptacja | ✅ |
| 4 — Dispatcher WP + GitHub | planowane |

## Model stron (skrót)

Redaktor ma przypisaną **stronę** (`sites` / `user_sites`). Nowy post dziedziczy `site_id` → przy publikacji admin widzi tylko destynacje z `site_destinations` dla tej strony.
