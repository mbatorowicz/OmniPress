# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).  
Wersja: **SSOT → `package.json`**. Build: **git commit** w etykiecie `semver+commit`.

## [Unreleased]

### Dodane

- **Załączniki XLSX i ZIP** w panelu „Pliki do pobrania” (obok GPKG): allowlista MIME + magic bytes (kontener ZIP / SQLite), limit 50 MB — `setup:storage-xlsx-zip`.
- **Transfery GitHub (optymalizacja):** pomijanie niezmienionych assetów (porównanie Git blob SHA), sprzątanie orphanów przy republish, import po SHA, withdraw bez recursive tree całego repo, sukces publikacji po commicie GitHub (błąd weryfikacji Vercel nie wymusza ponownego uploadu). Migracja `setup:assets-content-sha`.
- **Atomowa publikacja GitHub:** jeden commit na wpis (assety + Markdown + rejestr zmian + opcjonalnie PDF viewer / cleanup slug) — jeden deploy Vercel.
- **Workflow UI:** pasek ścieżki (redaktor + kolejka admina), szybka akceptacja z listy, decyzja approve/reject nad podglądem.
- **Bulk w kolejce admina:** akceptacja/odrzucenie (*Do akceptacji*), anulowanie harmonogramu (*Zaplanowane*); dezaktywacja/usuwanie jak wcześniej (*Na stronie*).

### Naprawione

- **Dodawanie użytkownika (produkcja):** przycisk „+ Nowy użytkownik” nie otwierał okna modalnego — CSP bez `unsafe-inline` blokowało skrypt, który Astro wstawiało inline w HTML (dotyczyło też „Testuj kanał”). Skrypty klienta zawsze trafiają do `_astro/*.js` (`vite.build.assetsInlineLimit`).
- Withdraw strony statycznej: poprawne wywołanie `deleteGitHubFile` (wcześniej SHA trafiało do message).
- **MFA TOTP** dla administratora (Supabase Auth): enrollment `/auth/mfa/setup`, challenge `/auth/mfa`, wymuszenie AAL2 w middleware.
- **CSP z nonce** per żądanie (bez `unsafe-inline` dla skryptów); `style-src 'unsafe-inline'` dla TipTap.
- **Rate limit auth** współdzielony: Upstash Redis (preferowany) lub tabela `auth_rate_limits` + RPC (`setup:auth-rate-limits`).
- Audyt **fine-grained GitHub PAT** przy teście kanału (ostrzeżenie dla classic `ghp_`).
- Limit załączników PDF/DOCX/plików do pobrania **50 MB**; panel „Pliki do pobrania” na inne typy (`setup:storage-gpkg`).
- Upload assetów **bezpośrednio do Supabase Storage** (signed URL) — omija limit body Vercel (~4,5 MB).

### Zmienione

- **Wording UI:** etykiety i komunikaty bez narracji technicznej (commit/worker/deploy); ścieżka workflow: Akceptacja → Publikacja → Na stronie.
- IP rate limitu z nagłówka `x-real-ip` (Vercel).
- Dokumentacja tokena GitHub: fine-grained PAT z dostępem tylko do repo strony (`docs/WDROZENIE.md`).
- Publikacja dużych assetów na GitHub (≥ 8 MB) przez Git Data API zamiast Contents API.
- Publikacja GitHub: automatyczny retry przy konflikcie SHA (HTTP 409) — typyczne przy bulk akceptacji.

## [0.9.5] — 2026-06-03

### Zmienione

- Spójne nazewnictwo w panelu admina: „strona” zamiast „jednostka”, „Wygląd strony” zamiast „Layout Astro”, „Szerokie menu” zamiast „Mega menu”, krótsze komunikaty zapisu i syncu.

## [0.9.4] — 2026-06-03

### Zmienione

- Subnav jednostki: **Menu**, **Kategorie**, **Komponenty** na początku; **Ustawienia** (jeden formularz: strona + GitHub/Vercel) na końcu.
- Edytor menu: spójne etykiety poziomów (Menu główne / Podmenu / Podmenu zagnieżdżone); mega menu widoczne tylko na poziomie głównym.
- `/admin/units/[id]/publish` → przekierowanie 301 na `/admin/units/[id]`.

## [0.9.3] — 2026-06-03

### Zmienione

- Panel strony: monolit „Layout Astro” rozbity na zakładki **Menu**, **Kategorie**, **Komponenty**; ustawienia techniczne w **Publikacja**; **Ogólne** = nazwa, slug, aktywność.
- Menu: edytor drzewa (do 3 poziomów) zamiast głównego pola JSON; zapis sekcji przez `POST layout/save?section=`.
- Import layoutu z GitHub wraca na zakładkę, z której wywołano import (`return_section`).
- Stara trasa `/admin/units/[id]/layout` → przekierowanie 301 na `/navigation`.

### Dodane

- Helpery współdzielone: `loadLayoutEditorContext`, `resolveSiteGitHubChannel`, `LayoutSyncActions`, parser menu z formularza.
- Testy Vitest: `navigation-form.test.ts`.

## [0.9.2] — 2026-06-03

### Naprawione

- Publikacja GitHub (layout folder): załączniki trafiają do tego samego folderu co `index.md` (`postDir` z `pickMarkdownPath`), nie do osobnego `posts.slug` — naprawia 404 PDF na stronie gminy przy rozjechanym slug.
- Przy zmianie slug między publikacjami: wpis publikowany do nowego folderu, stary folder sprzątany z repo (`expandGitHubWithdrawPaths` + batch delete).
- Migracja `npm run setup:fix-kgw-slug` — synchronizacja `posts.slug` i `publish_logs.external_id` dla wpisu KGW.

## [0.9.1] — 2026-06-11

### Dodane

- Redaktor może **usuwać własne wpisy** (status *Szkic* / *Odrzucony*) wraz z plikami w Storage — przycisk „Usuń wpis” w edytorze; migracja `setup:posts-delete-own` (RLS delete dla autora).

### Zmienione

- Data publikacji **opcjonalna** — bez daty wpis dostaje datę publikacji w momencie wysłania do akceptacji (publikacja od razu po akceptacji).
- Godzina publikacji wybierana z listy **co godzinę 6:00–20:00** (osobne pola: data + godzina) zamiast dowolnego `datetime-local`.

## [0.9.0] — 2026-06-11

### Zmienione

- Nawigacja: pełny rozdział **Administracja / Panel treści** (przyciski w nagłówku); sidebar tylko w `/admin/*` z trzema pozycjami: *Kolejka wpisów*, *Strony*, *Użytkownicy*.
- Kolejka wpisów: 3 sekcje (*Do akceptacji*, *Zaplanowane*, *Opublikowane*); wpisy w trakcie publikacji w sekcji *Zaplanowane* ze znacznikiem **W toku**.
- Strony (`/admin/sites`): lista jako **kafelki** + kafelek „+ Dodaj stronę”; kliknięcie kafelka otwiera ustawienia strony; etykiety „jednostka” → „strona”.

### Dodane

- **Użytkownicy** (`/admin/users`, zastępuje `/admin/editors` — redirect 301): konta administratorów i redaktorów; tworzenie z rolą w oknie modalnym („+ Nowy użytkownik”), ustawienia konta (nazwa, rola, hasło), uprawnienia redaktora (strony + domyślna), usuwanie kont.
- Zabezpieczenia: nie można usunąć własnego konta ani usunąć/zdegradować ostatniego administratora.
- Migracja `setup:author-on-delete` — po usunięciu konta wpisy i strony statyczne zostają (`author_id = null`, w UI „konto usunięte”).

## [0.8.1] — 2026-06-11

### Dodane

- Testy E2E/UI (Playwright, `e2e/`) — domyślnie na produkcji: strefa publiczna, nagłówki bezpieczeństwa, CSRF, logowanie/wylogowanie, panel admina, pełny cykl wpisu (szkic → walidacja kategorii → zapis → usunięcie ze sprzątaniem).
- Skrypty `npm run test:e2e` i `test:e2e:ui`; konto testowe z `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` lub lokalnego `.admin-password.txt`.

## [0.8.0] — 2026-06-10

### Zmienione (refaktor UI)

- Panel admina: stały **sidebar nawigacji** (Kolejka wpisów, Panel treści, Jednostki, Redaktorzy) zamiast rozproszonych przycisków; szerszy obszar roboczy (`max-w-7xl`).
- **Breadcrumby** na wszystkich zagnieżdżonych stronach (`Breadcrumbs` w `ui/navigation`) — jeden wzorzec zamiast trzech wariantów „← wstecz”.
- `/admin` odchudzony: tylko kolejki wpisów + podsumowanie sekcji z kotwicami; usunięte zdublowane panele „Strony” i „Panel treści”; import GitHub jako zwijana sekcja na dole.
- Edytor strony statycznej (`/admin/units/[id]/pages/[pageId]`) odzyskał nawigację kontekstu jednostki (breadcrumb + zakładki).
- Lista jednostek: przycisk „Edytuj” zamiast nieklikalnej etykiety; ujednolicona nazwa „Jednostki (strony)”.
- Dashboard redaktora: połączone panele („Twoje strony” jako tagi w panelu artykułów).
- i18n: usunięte hardkodowane teksty (redaktorzy, strony statyczne, kategoria w edytorze, licznik wpisów przy usuwaniu jednostki).

## [0.7.18] — 2026-06-09

### Dodane

- Admin → Layout: widget **Komunikaty CERT Polska** — pobieranie z RSS `moje.cert.pl`, sync do `omnipress-cert-advisories.json` w repo Astro.
- Cron Vercel: `/api/worker/cert-sync` (codziennie 07:00 UTC) — odświeża komunikaty dla aktywnych stron z włączonym widgetem.
- Publiczne API: `GET /api/cert/advisories?limit=5&category=Dla+użytkowników`.

## [0.7.17] — 2026-06-08

### Dodane

- Redaktor: pole daty i godziny publikacji (Europe/Warsaw); wymagane przy wysłaniu do akceptacji.
- Admin: status `scheduled` i kolejka zaplanowanych wpisów; worker publikuje po `scheduled_publish_at`.
- Worker publikacji: start przy `/admin`, po akceptacji natychmiastowej; cron Vercel 06:00 UTC (limit Hobby — co godzinę wymaga Pro).
- Migracja: `npm run setup:scheduled-publish`.

## [0.7.16] — 2026-06-06

### Dodane

- Edytor: usuwanie zdjęć z galerii (przycisk ×, potwierdzenie, DELETE API).

### Bezpieczeństwo

- Migracja RLS: trigger blokujący eskalację `role` i `default_site_id` w `profiles`.
- Auth: rate limit, blokada cross-origin POST, generyczne komunikaty błędów, anti-enumeracja resetu.
- Middleware: nagłówki bezpieczeństwa HTTP (HSTS w prod).
- Upload: weryfikacja magic bytes; usunięto surowe `detail` z odpowiedzi API.
- API kategorii: jawna weryfikacja dostępu do strony.
- `setup:auth-urls`: wyłącza publiczną rejestrację (`disable_signup`).

## [0.7.15] — 2026-06-05

### Naprawione

- Withdraw GitHub: usuwa cały folder wpisu (także pliki w podfolderach).

## [0.7.14] — 2026-06-05

### Naprawione

- Withdraw / bulk delete z GitHub: PATCH ref używa `/git/refs/` (wcześniej błędne `/git/ref/` → 404).

## [0.7.13] — 2026-06-05

### Porządki

- Usunięto martwy komponent `PostAttachmentsEditor.astro`, skrypty debug w `scripts/`.
- Usunięto dokumentację legacy: `RUNBOOK-MIGRACJA.md`, `PRD_AUDIT.md`.
- Przepisano docs na stan faktyczny (STATUS, PRD, README, REDAKTOR, WDROZENIE).
- Dodano `npm run setup:remove-wordpress`.

## [0.7.12] — 2026-06-05

### Zmienione

- SSOT stylów UI: `src/styles/ui.css`, komponenty `src/components/ui/`.
- Refaktoryzacja paneli admin, dashboard, auth.

## [0.7.11] — 2026-06-04

### Naprawione

- Withdraw z GitHub — usuwanie całego folderu wpisu; CMS nie kasuje przy błędzie remote.
- Import pomija ponowne pobieranie niezmienionych assetów.

## [0.7.10] — 2026-06-04

### Usunięte

- WordPress z kodu, UI i bazy (`setup:remove-wordpress`).

## [0.7.9] — 2026-06-04

### Dodane

- Weryfikacja logów buildu Vercel po publikacji.

## [0.7.6–0.7.8] — 2026-06

### Zmienione

- Jednostka = strona + destynacja GitHub w jednym formularzu.
- Usunięto osobne trasy `/admin/destinations`.

## [0.7.0–0.7.5] — 2026-06

### Dodane

- Edytor WYSIWYG (TipTap), galeria, bulk dezaktywacja/usuwanie.
- Import wpisów z GitHub, czytelna lista admina, dezaktywacja pojedynczych wpisów.

## [0.5.0–0.6.0] — 2026-06

### Dodane

- Layout Astro (menu, sloty, kategorie), ostatnie zmiany.
- PDF w edytorze, poprawki opublikowanych wpisów, cover i galeria.

## [0.4.0–0.4.5] — 2026-06-03

### Dodane

- Worker publikacji, adapter GitHub-Astro, kreator jednostek.
- Panel admin Faza 3 (strony, redaktorzy, akceptacja).

Szczegóły starszych wydań — historia commitów w repozytorium.
