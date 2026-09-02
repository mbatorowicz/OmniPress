# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).  
Wersja: **SSOT → `package.json`**. Build: **git commit** w etykiecie `semver+commit`.

## [Unreleased]

### Dodane

- **Administrator publikuje szkice redaktorów i przechodzi całą ich ścieżkę** (`/admin/posts/[id]`): dotąd *Zaakceptuj i opublikuj* pojawiało się wyłącznie przy statusie `pending`, więc szkic, którego redaktor nie wysłał (urlop, choroba, zapomniał), był w panelu ślepą uliczką — admin mógł go poprawić, ale nie ruszyć na stronę. Teraz do publikacji można skierować `draft`, `rejected` i `pending` (`APPROVABLE_STATUSES` w `lib/posts/access-model.ts`); przy szkicu przycisk nazywa się *Opublikuj szkic*. Przed publikacją sprawdzany jest tytuł i kategoria — bez nich front-matter byłby niepełny, więc przycisk jest zablokowany z podpowiedzią, co uzupełnić w korekcie. Szkic bez daty publikacji dostaje datę akceptacji (front-matter nie spada na `updated_at`). Zapis statusu jest warunkowany statusem odczytanym przed decyzją, więc równoległe wysłanie przez redaktora nie zostaje nadpisane. Druga droga: w korekcie (`/admin/posts/[id]/edit`) admin ma teraz *Wyślij do akceptacji* — może przeprowadzić cudzy wpis dokładnie ścieżką redaktora (szkic → do akceptacji → publikacja), a nie tylko skrótem. Bulk *Zaakceptuj zaznaczone* przyjmuje te same statusy. Migracja nie była potrzebna — RLS (`posts_admin`) od początku dawał adminowi pełny dostęp, blokada była w warstwie aplikacji. Testy: `approve-post.test.ts` (7 przypadków), `access.test.ts`.
- **Wszystkie wpisy redaktorów w jednym miejscu + filtry i sortowanie** (`/admin/posts`, sidebar *Wszystkie wpisy*): kolejka pokazywała wyłącznie statusy `pending`, `scheduled`, `publishing` i `published`, więc **szkice i wpisy do poprawki były dla administratora niewidoczne** — mimo że RLS (`posts_admin`) i `canEditPost` pozwalały je otwierać i poprawiać. Nowa lista ma zakładki statusów z licznikami (jeden klik na *Szkic*), filtr po tytule, statusie, stronie i autorze, sortowanie po tytule / dacie utworzenia / ostatniej zmianie (select albo klik w nagłówek kolumny, drugi klik odwraca kolejność) oraz stronicowanie po 25 wpisów. Przy wpisach przed publikacją jest przycisk *Edytuj* prowadzący prosto do edytora — zapis nie zmienia statusu, więc szkic zostaje szkicem u redaktora. Filtry i strona siedzą w adresie (widok „szkice redaktora X” można dodać do zakładek); wartości z URL przechodzą przez whitelistę (statusy, kolumny sortowania, UUID stron i autorów, fraza bez znaków wieloznacznych `%_*`), więc adres nie może zmienić semantyki zapytania. **Ta sama przeglądarka działa na liście redaktora** (`/dashboard`) — zawężona do własnych wpisów, bez filtra autora. Migracja nie była potrzebna. Testy: `browse-model.test.ts`, `browse.test.ts` (28 przypadków) + E2E `posts-browse.spec.ts` (filtry, sortowanie, otwarcie cudzego szkicu w edytorze).
- **Korekta wpisu przez administratora przed publikacją** (`/admin/posts/[id]/edit`): przycisk *Popraw wpis* nad podglądem otwiera pełny edytor redaktora — kategoria, tytuł, slug, data i godzina publikacji, treść, galeria (kolejność, zajawka), dodawanie i usuwanie załączników oraz **tryb każdego PDF-a: link do pobrania albo podgląd na stronie**. Dotąd admin mógł ruszyć tylko cudzy szkic lub wpis odrzucony; wpis *Do akceptacji* wymagał odrzucenia z uwagami i czekania na redaktora. Teraz edytowalne są statusy `draft`, `rejected`, `pending` i `scheduled` (`publishing` / `published` nadal przez *Oddaj do poprawki* / *Zdejmij ze strony*). Zapis nie zmienia statusu, więc po korekcie admin wraca na ekran akceptacji i publikuje. Baza nie wymagała migracji — RLS (`posts_admin`, `assets_admin`, polityki Storage admina) dawał adminowi pełny dostęp; blokada była wyłącznie w warstwie aplikacji (`canEditPost`). Regresję pilnuje test E2E `admin-post-correction.spec.ts` (szkic → wysłanie → korekta admina → status bez zmian).
- **Instrukcja redaktora w panelu** (`/dashboard/help`): logowanie, nowy artykuł, pola, załączniki, statusy i typowe problemy — te same etykiety co w UI. Wejście: *Pomoc* w nagłówku oraz *Instrukcja* na liście wpisów. Lustro dla wydruku: [docs/REDAKTOR.md](docs/REDAKTOR.md).
- **Walidacja wejścia w repo strony** (audyt P1-9, P1-6, podejście 14): repo Astro sprawdza `omnipress-layout.json` przed odczytem (nieznany komponent, komponent w niedozwolonej strefie, nieznana strefa lub klucz korzenia, duplikat `id`, slug kategorii poza `[a-z0-9-]`, wpis recent changes bez wymaganych pól), a schematy kolekcji treści są `.strict()`. Niezgodność przerywa build z jawnym komunikatem — poprzednie wdrożenie zostaje na produkcji, zamiast wyjść stroną z pustą sekcją. Lista komponentów w repo strony (`src/config/layout-components.ts`) jest lustrem SSOT z `lib/astro-layout/components.ts`: nowy komponent wymaga wpisu po obu stronach.
- **Testy modułów krytycznych** (audyt, podejście 10): sesja SSR, pipeline middleware, trasy i guardy auth, nonce CSP, guard admina, kolejka i worker publikacji, GitHub API — 238 przypadków, każdy zweryfikowany mutacyjnie. Testy integracyjne RLS (`RLS_TEST_DATABASE_URL`, opt-in) potwierdzają, że redaktor nie sięga poza przypisane strony.
- **Załączniki XLSX i ZIP** w panelu „Pliki do pobrania” (obok GPKG): allowlista MIME + magic bytes (kontener ZIP / SQLite), limit 50 MB — `setup:storage-xlsx-zip`.
- **Transfery GitHub (optymalizacja):** pomijanie niezmienionych assetów (porównanie Git blob SHA), sprzątanie orphanów przy republish, import po SHA, withdraw bez recursive tree całego repo, sukces publikacji po commicie GitHub (błąd weryfikacji Vercel nie wymusza ponownego uploadu). Migracja `setup:assets-content-sha`.
- **Atomowa publikacja GitHub:** jeden commit na wpis (assety + Markdown + rejestr zmian + opcjonalnie PDF viewer / cleanup slug) — jeden deploy Vercel.
- **Workflow UI:** pasek ścieżki (redaktor + kolejka admina), szybka akceptacja z listy, decyzja approve/reject nad podglądem.
- **Bulk w kolejce admina:** akceptacja/odrzucenie (*Do akceptacji*), anulowanie harmonogramu (*Zaplanowane*); dezaktywacja/usuwanie jak wcześniej (*Na stronie*).

### Naprawione

- **Nazwa kategorii w front-matterze ginęła przy wysłaniu bez zapisu:** *Wyślij do akceptacji* zapisywało tylko `category_slug`, więc świeży szkic wysłany od razu po wybraniu kategorii (bez kliknięcia *Zapisz szkic*) trafiał na stronę z pustym `categoryName`. Teraz endpoint domyka też nazwę przez `resolvePostCategoryFields`; przy niedostępnej liście kategorii z repo Astro zostaje sam slug, więc wysłanie nadal działa.
- **Wygasły token GitHub kończył się nieczytelnym błędem:** publikacja zwracała surowe `GitHub GET 401: {"message":"Bad credentials"}` i redaktor nie wiedział, co zrobić. Teraz komunikat mówi wprost, że token wygasł, i wskazuje pole do wymiany (Ustawienia jednostki → Kanał publikacji); surowa treść zostaje w nawiasie dla diagnostyki. „Testuj połączenie" pokazuje datę ważności tokenu (nagłówek `github-authentication-token-expiration`), więc wygaśnięcie widać przed publikacją.
- **Wpis pobierał 70 MB PDF-ów przy wejściu na stronę** (audyt P1-16): viewer wyłączał czytanie zakresami dla każdej ścieżki same-origin, choć powodem wyjątku był tylko endpoint podglądu w panelu (odpowiada całym body bez `Accept-Ranges`). Statyczne załączniki strony (`/post-files/…`) też się łapały, mimo że produkcja obsługuje na nich `Range`. Do tego wszystkie viewery montowały się przy wejściu, bez oglądania się na widok — wpis z pięcioma dokumentami ciągnął ~70 MB naraz. Wyjątek zawężony do `/api/posts/{id}/assets/{assetId}/file`, montaż leniwy (`IntersectionObserver`).
- **Eskalacja uprawnień (produkcja, krytyczne):** trigger `profiles_guard_self_update` nie istniał w bazie mimo deklaracji w STATUS.md — redaktor mógł ustawić sobie `role = 'admin'`. Migracja `setup:profiles-guard` zastosowana; regresję pilnuje test integracyjny RLS.
- **Sesja SSR:** ciasteczko skasowane w trakcie żądania (wylogowanie) wracało z `getAll` ze starą wartością — adapter Supabase widział nieaktualny token.
- **API administratora bez MFA:** zwracało przekierowanie 302 na stronę HTML zamiast błędu JSON 403, przez co panel pokazywał ogólny komunikat zamiast informacji o wymaganym MFA.
- **Ponowienia publikacji GitHub:** błędy typu `GitHub ref GET 404` / `GitHub DELETE 404` nie były rozpoznawane po statusie i trafiały do ponawiania jako przejściowe — trwałe błędy konfiguracji (zły branch, zły token) próbowały się cztery razy.
- **Dodawanie użytkownika (produkcja):** przycisk „+ Nowy użytkownik” nie otwierał okna modalnego — CSP bez `unsafe-inline` blokowało skrypt, który Astro wstawiało inline w HTML (dotyczyło też „Testuj kanał”). Skrypty klienta zawsze trafiają do `_astro/*.js` (`vite.build.assetsInlineLimit`).
- **Adres produkcji:** `omni-press.cncsolutions.dev` zamiast nieistniejącego `omni-press.vercel.app` (linki resetu hasła i callbacku Auth prowadziły na 404). SSOT: `APP.productionOrigin`; skrypty i testy czytają go przez `scripts/lib/app-origin.mjs`.
- **Testy E2E:** setup logowania przechodzi challenge MFA (TOTP) — bez tego cały zestaw padał od wprowadzenia AAL2. Nowy test regresji dodawania użytkownika (`e2e/user-create.spec.ts`) sprawdza też brak naruszeń CSP.
- Withdraw strony statycznej: poprawne wywołanie `deleteGitHubFile` (wcześniej SHA trafiało do message).
- **MFA TOTP** dla administratora (Supabase Auth): enrollment `/auth/mfa/setup`, challenge `/auth/mfa`, wymuszenie AAL2 w middleware.
- **CSP z nonce** per żądanie (bez `unsafe-inline` dla skryptów); `style-src 'unsafe-inline'` dla TipTap.
- **Rate limit auth** współdzielony: Upstash Redis (preferowany) lub tabela `auth_rate_limits` + RPC (`setup:auth-rate-limits`).
- Audyt **fine-grained GitHub PAT** przy teście kanału (ostrzeżenie dla classic `ghp_`).
- Limit załączników PDF/DOCX/plików do pobrania **50 MB**; panel „Pliki do pobrania” na inne typy (`setup:storage-gpkg`).
- Upload assetów **bezpośrednio do Supabase Storage** (signed URL) — omija limit body Vercel (~4,5 MB).

### Zmienione

- **Reguły dostępu do wpisu jako moduł czysty** (`lib/posts/access-model.ts`): predykaty `canEditPost`, `canDeletePost`, `isAdminEditableStatus` itd. odcięte od zapytań Supabase, które zostały w `access.ts` (re-eksport, więc importy się nie zmieniają). Bez tego lista wpisów nie mogłaby decydować w komponencie, którym wpisom pokazać *Edytuj* — reguła warstw zabrania komponentom sięgać po moduły danych.
- **Cudzy wpis admin prowadzi z panelu akceptacji:** wejście na `/dashboard/posts/[id]` wpisu innego autora przekierowuje na `/admin/posts/[id]`, gdzie obok podglądu są korekta i decyzja. Wcześniej admin edytował cudzy szkic pod etykietami redaktora („Zapisz szkic”, powrót do `/dashboard`), bez dostępu do akceptacji.
- **Decyzja: załączniki wpisów zostają w gicie** (audyt P1-3, podejście 12). Limit „100 MB" Vercela okazał się rozmiarem pojedynczego pliku, nie sumą źródeł (zweryfikowane deployami), a panel przyjmuje maksymalnie 50 MB — żadna publikacja nie może go przekroczyć. Przeniesienie do Storage obniżyłoby pułap transferu i odebrałoby repozytorium samowystarczalność. Rewizję decyzji wymusza bramka `lint-content-weight.mjs` w repo strony przy 300 MB załączników.
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
