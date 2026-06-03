# Changelog

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).  
Wersja produktu: **SSOT → `package.json`**. Build: **SSOT → git commit** (w etykiecie `semver+commit`).

## [0.3.1] — 2026-06-03

### Dokumentacja

- STATUS, ADMIN, REDAKTOR, RUNBOOK-MIGRACJA; PRD vs kod (warstwy SSOT).
- Indeks docs/README, aktualizacja WDROZENIE, PRD_AUDIT, ROLE_AGENT.

### Porządki

- Usunięte: deprecated `auth/messages.ts`, zduplikowane skrypty auth, `admin-phase3` → `admin-panels`.
- i18n: `common.saved`, usunięte martwe re-exporty.

## [0.3.0] — 2026-06-03

### Dodane (Faza 3)

- Panel admin: CRUD stron (`/admin/sites`), destynacji (`/admin/destinations`) z szyfrowanymi credentials.
- Mapowanie `site_destinations` i przypisanie redaktorów (`/admin/editors`).
- Akceptacja wpisu: wybór destynacji, `publish_logs` (pending), status `published`.
- Odrzucenie wpisu z wymaganym `rejection_note`.
- `src/lib/admin/`, migracja `UNIQUE(site_id, slug)`, `npm run setup:phase3`.

## [0.2.0] — 2026-06-03

### Dodane (Faza 2)

- Panel redaktora: nowy artykuł, lista wpisów, edytor Markdown.
- Zapis szkicu, wysłanie do akceptacji (`pending`), upload zdjęć do Supabase Storage.
- Podgląd wpisu dla admina (`/admin/posts/:id`).
- Migracja `post-assets` bucket.

## [0.1.2] — 2026-06-03

### Naprawione

- Auth: adapter ciasteczek z merge w żądaniu, logowanie z `data.user`, reset hasła w pełni po SSR.
- `/api/auth/set-password`, `/api/auth/establish-session`; dokumentacja `docs/AUTH.md`.

## [0.1.1] — 2026-06-03

### Naprawione

- Logowanie: zapis sesji w ciasteczkach (`getAll`/`setAll`), endpointy `/api/auth/login` i `/api/auth/reset`.
- Reset hasła: czytelne komunikaty błędów; poprawny klucz JWT zamiast publishable key.
- Przekierowanie po logowaniu bez pętli na `/login`.

## [0.1.0] — 2026-06-03

### Dodane

- Wersja w UI powiązana z commitem (`0.1.0+{sha}`), moduł `src/config/app.ts`, `scripts/lib/git-info.mjs`.
- Stopka panelu i badge na stronach publicznych.
- Dokumentacja `docs/VERSIONING.md`.
- Alias importów `@/*`.

### Zmienione

- Faza 1: logowanie hasłem, reset hasła, integracja Vercel ↔ Supabase.

[0.1.0]: https://github.com/mbatorowicz/OmniPress/compare/4bd1f0b...d7f8740
