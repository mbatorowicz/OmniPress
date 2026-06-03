# OmniPress

Headless CMS do przygotowania treści przez redaktorów i publikacji na wielu platformach (WordPress, Astro/GitHub) z jednego panelu.

- Wymagania produktowe: [PRD.md](./PRD.md)
- Schemat bazy: [supabase/migrations/20250603000000_initial_schema.sql](./supabase/migrations/20250603000000_initial_schema.sql)

## Stack (Faza 1)

- Astro 6 SSR + Tailwind CSS v4
- Supabase (Auth, PostgreSQL, RLS)
- Deploy: Vercel (`@astrojs/vercel`)

## Szybki start

### 1. Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. W **SQL Editor** wklej i uruchom całą migrację z `supabase/migrations/20250603000000_initial_schema.sql`.
3. W **Authentication → Providers** włącz Email (hasło).
4. Utwórz użytkownika (e-mail/hasło).
5. Nadaj rolę admina i stronę — wzór w `supabase/seed.example.sql`.

### 2. Lokalnie

```bash
cp .env.example .env
# uzupełnij PUBLIC_SUPABASE_URL i PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Aplikacja: http://localhost:4321

### 3. Vercel

Dodaj te same zmienne środowiskowe w ustawieniach projektu. Połącz repozytorium [OmniPress](https://github.com/mbatorowicz/OmniPress).

## Struktura

```
src/
  layouts/       — wspólny układ panelu
  lib/           — Supabase, auth, typy, szyfrowanie (stub)
  middleware.ts  — sesja, ochrona tras /admin i /dashboard
  pages/
    login.astro
    dashboard/   — redaktor
    admin/       — administrator
supabase/
  migrations/    — schemat PostgreSQL + RLS
```

## Kamienie milowe

| Faza | Status |
|------|--------|
| 1 — Auth, schema, szkielet | ✅ w repozytorium |
| 2 — Edytor, szkice, Storage | planowane |
| 3 — CRUD stron/destynacji | planowane |
| 4 — Dispatcher WP + GitHub | planowane |

## Model stron (skrót)

Redaktor ma przypisaną **stronę** (`sites` / `user_sites`). Nowy post dziedziczy `site_id` → przy publikacji admin widzi tylko destynacje z `site_destinations` dla tej strony.
