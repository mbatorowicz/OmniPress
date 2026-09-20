# Stan implementacji OmniPress

**SSOT:** co jest zbudowane w wersji **0.19.4** (kod + baza + panel).

Produkcja panelu: https://omni-press.cncsolutions.dev  
Produkcja UG: https://gmina-miedzna.pl (cutover 2026-09-16) — gałąź `main` + publikacje OmniPress  
Staging UG: https://gmina-miedzna.cncsolutions.dev — gałąź `staging`  
Produkcja SP: https://sp-miedzna.pl (cutover 2026-09-17) — gałąź `main` + publikacje OmniPress  
Staging SP: https://sp-miedzna.cncsolutions.dev — gałąź `staging`

**Audyt migracji:** podejścia 1–18 zamknięte (2026-09-03). Szczegóły: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md).

**Audyt bezpieczeństwa (2026-09-07):** S-1–S-4 zamknięte. **Audyt kategorii:** 22–25 zamknięte. Plan: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md).

**Dostępność WCAG (2026-09-17):** plan [PLAN-DOSTEPNOSC.md](./PLAN-DOSTEPNOSC.md) zamknięty (D-1–D-22 + podejścia 10–11). Deklaracja na stronie: **w pełni zgodna**. Mapy planu ogólnego i archiwalne dokumenty sprzed 23.09.2018 — wyłączenia z art. 3 ustawy. Badanie HTML: 0 naruszeń axe 2.1 AA na stagingu.

---

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Aplikacja | Astro 7 SSR, Tailwind CSS v4 |
| Hosting | Vercel (`@astrojs/vercel`, cron worker) |
| Baza + Auth | Supabase (PostgreSQL, RLS, Auth, Storage) |
| Edytor | TipTap → zapis jako Markdown |
| Publikacja | GitHub API → repo Astro → opcjonalnie deploy Vercel |

Jedyny typ destynacji: **`github_astro`**.

---

## Role i trasy

| Rola | Logowanie | Panel |
|------|-----------|-------|
| Redaktor | `/login` | `/dashboard`, `/dashboard/posts/[id]` |
| Administrator | `/login` | `/admin`, `/admin/posts`, `/admin/sites`, `/admin/units/*`, `/admin/users/*`, `/admin/usage`, `/admin/posts/[id]` |

Nawigacja: nagłówek z przyciskami *Administracja* / *Panel treści*; sidebar (tylko `/admin/*`): Kolejka wpisów, Wszystkie wpisy, Strony, Użytkownicy, Baza i pliki. Stare `/admin/editors/*` przekierowuje (301) na `/admin/users/*`.

Reset hasła: `/login?mode=reset` → `/auth/reset-password`.

---

## Redaktor

| Funkcja | Status |
|---------|--------|
| Logowanie e-mail/hasło | ✅ |
| Przypisanie do stron (`user_sites`, `default_site_id`) | ✅ |
| Tworzenie szkicu na dozwolonej stronie | ✅ odświeżenie karty przywraca niewysłane pola; szkic może też powstać z maila na skrzynkę inbound |
| Edytor WYSIWYG (TipTap) → Markdown | ✅ jeden renderer Markdown + ten sam odstęp akapitów; emoji zdejmowane przy wpisie, wklejce, tytule i zapisie |
| Kategoria główna + dodatkowe (np. Aktualności → strona główna) | ✅ |
| Galeria zdjęć (cover + kolejność) | ✅ miniatura i postęp uploadu od razu; JPEG/PNG/WebP → max 1920 px, WebP |
| Załączniki PDF (link / podgląd, do 50 MB) | ✅ signed upload → Supabase Storage; edytowalna nazwa na stronie |
| Załączniki DOCX (link, do 50 MB) | ✅ edytowalna nazwa na stronie |
| Pliki do pobrania (GPKG / XLSX / ZIP, do 50 MB) | ✅ `setup:storage-xlsx-zip`; edytowalna nazwa |
| Zapis szkicu, wysłanie do akceptacji | ✅ |
| Data publikacji + godzina z listy 6:00–20:00 (czas polski); bez daty = publikacja w momencie wysłania | ✅ na stronie zostaje data pierwszej publikacji (poprawka jej nie zmienia) |
| Usuwanie własnych wpisów (`draft` / `rejected`) wraz z plikami Storage | ✅ migracja `setup:posts-delete-own` |
| Edycja tylko `draft` / `rejected`; poprawki opublikowanych (amendment) | ✅ (administrator poprawia także `pending` / `scheduled`) |
| Podgląd treści po wysłaniu / odrzuceniu | ✅ |
| Lista własnych wpisów: filtr (tytuł, status, strona), sortowanie (domyślnie data publikacji), stronicowanie po 25 | ✅ `/dashboard` |
| Instrukcja w panelu (`/dashboard/help`) | ✅ | link *Pomoc* w nagłówku + *Instrukcja* na liście wpisów |

---

## Administrator

| Funkcja | Status |
|---------|--------|
| Strony (jednostki) — strona + GitHub w jednym formularzu | ✅ `/admin/units/new`, `/admin/units/[id]` |
| Lista stron jako kafelki + kafelek „+ Dodaj stronę” | ✅ `/admin/sites` |
| Użytkownicy: admini + redaktorzy (tworzenie z rolą, ustawienia konta, hasło, usuwanie) | ✅ `/admin/users`, `/admin/users/[id]` |
| Zużycie bazy i plików (PostgreSQL + Storage, rozkład typów, 10 największych) | ✅ `/admin/usage`; migracja `setup:usage-stats` |
| Uprawnienia redaktora (strony + domyślna); blokada: własne konto / ostatni admin | ✅ |
| Usunięcie konta zostawia wpisy (autor: „konto usunięte”) | ✅ migracja `setup:author-on-delete` |
| Kolejka: do akceptacji, zaplanowane (ze znacznikiem „Publikacja…”), na stronie | ✅ `/admin` — odznaka z liczbą *pending* przy *Administracja* i *Kolejka wpisów* |
| Szkic z poczty (skrzynka inbound) | ✅ `wpisy@inbound.cncsolutions.dev`; Grok **ogląda** załączniki (obraz/PDF); domyślnie jeden szkic; podmiana w panelu bez publikacji; niepewność → mail do Ciebie; jednostka z hopu; Telegram bez Akceptuj |
| Powiadomienie Telegram po wysłaniu do akceptacji | ✅ opcjonalne `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`; awaria bota nie blokuje submitu |
| Akceptacja wpisu z Telegrama | ✅ przycisk *Akceptuj* w wiadomości bota; webhook `/api/telegram/webhook`; odrzucenie w panelu |
| Wszystkie wpisy redaktorów — także szkice i wpisy do poprawki; zakładki statusów z licznikami, filtr (tytuł, status, strona, autor), sortowanie kolumn (domyślnie data publikacji), stronicowanie po 25 | ✅ `/admin/posts` |
| Akceptacja → kolejka publikacji GitHub (natychmiast lub o zaplanowanej godzinie) | ✅ |
| Publikacja szkicu / wpisu do poprawki bez czekania na redaktora (`draft`, `rejected`, `pending`) | ✅ blokada, gdy brak tytułu lub kategorii |
| Wysłanie cudzego wpisu do akceptacji (pełna ścieżka redaktora) | ✅ `/admin/posts/[id]/edit` |
| Odrzucenie z `rejection_note` | ✅ tylko `pending` |
| Korekta wpisu przed publikacją (`draft`, `rejected`, `pending`, `scheduled`) — treść, tytuł, slug, kategoria główna i dodatkowe, data, tryb załącznika (link / podgląd), galeria | ✅ `/admin/posts/[id]/edit` |
| Ponowne otwarcie wpisu (reopen) | ✅ |
| Dezaktywacja / usunięcie opublikowanego (withdraw z GitHub) | ✅ |
| Bulk: akceptacja / odrzucenie (pending), anulowanie harmonogramu, dezaktywacja / usuwanie | ✅ |
| Przypinanie wpisu na stronie głównej (`pinned`) | ✅ migracja `setup:posts-pinned` |
| Import wpisów z GitHub | ✅ auto przy wejściu na kolejkę i listę wpisów (bez przycisku) |
| Layout Astro (menu, kategorie, sloty) + sync do repo | ✅ pasek zgodności: zgodne / szkic do publikacji / wczytaj nowszą stronę; auto-wczytanie po hashu całego layoutu; pasek zdjęć obok logo w `header.brand`; lista kategorii w sidebarze (`sidebar.categories`) |
| Ustawienia strony (nazwa, slug, GitHub, tokeny) | ✅ `/admin/units/[id]` |
| Strony statyczne (admin) + publikacja do repo Astro | ✅ `/admin/units/[id]/pages` — auto-pull z GitHub, publikacja nie nadpisze pustką; załączniki jak we wpisach (PDF: link / podgląd, edytowalna nazwa) |
| Walidacja linków menu przed sync GitHub | ✅ |
| Ostatnie zmiany (ogłoszenia) | ✅ `/admin/units/[id]/changes` |
| Komunikaty CERT Polska (RSS → live API na stronie Astro) | ✅ Slot `sidebar.cert_advisories`; endpoint `/api/cert/advisories` na stronie jednostki (cache 15 min) |
| Ostrzeżenia pogodowe IMGW (osmet-teryt → live API na stronie Astro) | ✅ Slot `sidebar.weather`; endpoint `/api/weather/warnings` na stronie jednostki (cache 15 min) — OmniPress tylko konfiguruje slot; ukryty bez ostrzeżeń |
| Odbiór odpadów (harmonogram na stronie Astro) | ✅ Slot `sidebar.waste_reminders`; strona liczy terminy z markdownu harmonogramu (okno 2 dni; ukryty, gdy pusto) |
| Test połączenia GitHub | ✅ |
| Logi publikacji + retry ręczny | ✅ |
| Weryfikacja logów buildu Vercel po publikacji | ✅ (opcjonalnie token / project id) |
| Usuwanie jednostki (gdy brak wpisów) | ✅ |

---

## Publikacja (worker)

1. Admin akceptuje wpis (`draft`, `rejected` lub `pending`) → `publish_logs.pending` (z `next_retry_at` = data redaktora, jeśli w przyszłości). Szkic bez daty dostaje datę akceptacji.
2. Status `scheduled` (czeka) lub `publishing` (od razu). Worker `/api/worker/publish`: start po akceptacji natychmiastowej, przy wejściu admina na `/admin`, oraz cron Vercel (plan Hobby: raz dziennie 06:00 UTC; docelowo co godzinę na Pro).
3. **Atomowy commit** na GitHub (layout `flat` lub `folder`): tylko zmienione załączniki (SHA) + `index.md` + rejestr ostatnich zmian (+ PDF viewer / sprzątanie orphanów i starego folderu) — jeden deploy Vercel; bez zmian → bez commita.
4. Opcjonalnie: weryfikacja deployu Vercel (niepowodzenie nie wywołuje ponownego uploadu).
5. Sukces → `published`; błąd GitHub → `failed` (retry automatyczny + przycisk w UI).

Withdraw/deactivate: batch delete plików wpisu z GitHub (jeden commit; listing folderu zamiast całego tree).

---

## Migracje SQL (kolejność)

| Plik | npm |
|------|-----|
| `20250603000000_initial_schema.sql` | `setup:remote` |
| `20250604000000_storage_post_assets.sql` | `setup:storage` |
| `20250605000000_phase3_post_slug_unique.sql` | `setup:phase3` |
| `20250606000000_phase4_publish_worker.sql` | `setup:phase4` |
| `20250607000000_post_categories.sql` | `setup:categories` |
| `20250608000000_site_astro_layout.sql` | `setup:layout` |
| `20250609000000_storage_post_assets_pdf.sql` | `setup:storage-pdf` |
| `20250622000000_storage_post_assets_docx.sql` | `setup:storage-docx` |
| `20250623000000_storage_post_assets_gpkg.sql` | `setup:storage-gpkg` |
| `20250719000000_storage_post_assets_xlsx_zip.sql` | `setup:storage-xlsx-zip` |
| `20250907000000_storage_post_assets_private.sql` | `setup:storage-private` |
| `20250610000000_asset_display_mode.sql` | `setup:asset-display` |
| `20250611000000_asset_sort_order.sql` | `setup:asset-sort` |
| `20250612000000_remove_wordpress.sql` | `setup:remove-wordpress` |
| `20250613000000_profiles_self_update_guard.sql` | `setup:profiles-guard` |
| `20250614000000_post_scheduled_publish.sql` | `setup:scheduled-publish` |
| `20250615000000_site_pages.sql` | `setup:site-pages` |
| `20250616000000_storage_import_admin.sql` | `setup:storage-import-admin` |
| `20250617000000_author_on_delete_set_null.sql` | `setup:author-on-delete` |
| `20250618000000_posts_delete_own.sql` | `setup:posts-delete-own` |
| `20250619000000_posts_rejected_resubmit.sql` | `setup:posts-rejected-resubmit` |
| `20250620000000_assets_delete_own.sql` | `setup:assets-delete-own` |
| `20250621000000_fix_kgw_post_slug.sql` | `setup:fix-kgw-slug` |
| `20250707000000_auth_rate_limits.sql` | `setup:auth-rate-limits` |
| `20250718000000_assets_content_sha.sql` | `setup:assets-content-sha` |
| `20250827000000_posts_pinned.sql` | `setup:posts-pinned` |
| `20250902000000_github_reconcile.sql` | `setup:github-reconcile` |
| `20250906000000_post_extra_categories.sql` | `setup:extra-categories` |
| `20250915000000_assets_page_id.sql` | `setup:page-assets` |
| `20250916000000_admin_usage_stats.sql` | `setup:usage-stats` |
| `20260918000000_inbound_messages.sql` | `setup:inbound-email` |
| `20260920000000_inbound_intent.sql` | `setup:inbound-intent` |

Tabela opisuje **zamierzony** stan bazy. `lint-docs-setup.mjs` pilnuje zgodności `package.json` ↔ ta tabela, ale nie sprawdza produkcji — w audycie P0-7 okazało się, że jedna migracja nigdy tam nie trafiła. Przy wątpliwościach: porównaj z bazą (triggery, polityki, kolumny), nie z tym dokumentem.

---

## Bezpieczeństwo

| Warstwa | Status |
|---------|--------|
| RLS trigger `profiles` (role, default_site_id) | ✅ migracja `setup:profiles-guard` — zastosowana na produkcji 2026-08-27 (audyt P0-7), pokryta testem RLS |
| Wyłączenie public signup (Supabase) | ✅ `setup:auth-urls` |
| MFA TOTP (admin, AAL2) | ✅ `/auth/mfa/setup`, `/auth/mfa` |
| CSP z nonce (panel SSR) | ✅ middleware + `src/lib/security/headers.ts` |
| Rate limit auth (Upstash Redis lub Supabase RPC) | ✅ `setup:auth-rate-limits` |
| Origin check (auth POST) | ✅ |
| Nagłówki HTTP (HSTS, X-Frame-Options, …) | ✅ middleware |
| Fine-grained GitHub PAT (audyt przy teście kanału) | ✅ |
| Upload: magic bytes | ✅ |
| Anti-enumeracja resetu hasła | ✅ |
| Sanityzacja treści (edytor + zapis + publikacja) | ✅ |
| Rate limit MFA (TOTP) | ✅ ten sam limiter co login (`guardAuthMutationRequest`, akcja `mfa`) |

---

## Testy

| Warstwa | Narzędzie | Zakres |
|---------|-----------|--------|
| Jednostkowe (`npm test`) | Vitest | logika `lib/` — 185 plików testowych obok modułów (1165 testów + 22 RLS opt-in) |
| Typy (`npm run typecheck`) | `tsc --noEmit` | całe repo, zero błędów; wpięte w `npm run lint` jako bramka |
| Integracyjne RLS (opt-in) | Vitest + `pg` | `src/lib/supabase/rls.integration.test.ts` — 22 przypadki: izolacja redaktorów, dane wrażliwe, eskalacja uprawnień |
| E2E/UI (`npm run test:e2e`) | Playwright (`e2e/`) | produkcja: strefa publiczna, nagłówki bezpieczeństwa, CSRF, auth (logowanie/wylogowanie, błędne hasło), panel admina, lista wpisów z filtrami (`posts-browse.spec.ts`), cykl wpisu (szkic → walidacja → zapis → usunięcie) |

E2E domyślnie biegnie na produkcji (`E2E_BASE_URL` zmienia cel); dane logowania: `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` lub lokalny `.admin-password.txt`.

Testy RLS wymagają `RLS_TEST_DATABASE_URL` (`.env.local` lub zmienna środowiskowa) — bez niej `npm test` je pomija, żeby nie łączyć się z produkcją przypadkiem. Cała sesja biegnie w transakcji zakończonej `ROLLBACK`; baza zostaje bez zmian.

Wspólne narzędzia testowe: `src/lib/testing/supabase-fake.ts` (klient Supabase z rejestrem zapytań) i `src/lib/testing/fetch-fake.ts` (router `fetch`).

---

## Zmienne środowiskowe (Vercel prod)

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `SUPABASE_URL`, anon key | tak | Integracja Vercel ↔ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | tak (worker) | Worker publikacji — nie w UI |
| `CRON_SECRET` | tak (worker) | Autoryzacja cron → `/api/worker/publish` |
| `ENCRYPTION_KEY` | tak (credentials) | Szyfrowanie tokenów GitHub/Vercel w bazie |
| `VERCEL_TOKEN` | opcjonalnie | Globalny token do weryfikacji buildów (alternatywa: per destynacja) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | opcjonalnie (prod zalecane) | Współdzielony rate limit auth między instancjami Vercel |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | opcjonalnie | Powiadomienie i przycisk *Akceptuj* w Telegramie (BotFather); webhook: `setup:telegram-webhook`; zdjęcie profilu: `setup:telegram-photo` |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | tak (skrzynka) | Receiving: treść maila + podpis Svix webhooka `email.received` |
| `INBOUND_ALLOWED_FROM` | tak (skrzynka) | Allowlista From (przecinki / nowe linie, dokładne adresy) |
| `INBOUND_DEFAULT_SITE_SLUG` | tak (skrzynka) | Slug jednostki dla szkicu (produkcja: `gmina-miedzna-pl`) |
| `INBOUND_FALLBACK_AUTHOR_ID` | tak (skrzynka) | UUID profilu, gdy nadawca nie ma konta w panelu |
| `INBOUND_AI_MODEL` | opcjonalnie | Model AI Gateway; pusty string wyłącza Grok; brak = `spacexai/grok-4.6` (`reasoning: medium`) |
| `INBOUND_SITE_BY_DOMAIN` | opcjonalnie | `domena:slug` — hop, który przekazał maila do Ciebie (np. `gminamiedzna.pl:gmina-miedzna,sp-miedzna.pl:sp-miedzna`) |
| `INBOUND_SITE_BY_EMAIL` | opcjonalnie | dokładny `email:slug`; wygrywa z domeną |
| `AI_GATEWAY_API_KEY` | opcjonalnie | Klucz Gateway lokalnie; na Vercel wystarczy OIDC |

---

## Nie zaimplementowane (planowane)

| Funkcja | Uwagi |
|---------|--------|
| Powiadomienia e-mail (akceptacja/odrzucenie) | — |
| Passkeys dla admina | — |
| Audit log akcji administratora | — |
| SSO redaktorów | — |

---

## 0.19.4 — Szybsza skrzynka

- HTTP nie czeka na Groka: 200 od razu, ingest w tle (`waitUntil`). Zrywanie po ~50 s wynikało z czekania na model.
- Jedna tura, `reasoning: medium`, miniatury 1280 px, 2 strony PDF, pobieranie równolegle. Timeout 120 s. Log `inbound_ai_ok` ma `ms`.

## 0.19.3 — Podział plakatów po wyglądzie

- Grok ogląda załączniki jak miniatury: kolorystyka i klimat. Inny wygląd = osobny szkic; ten sam klimat / kolejne strony = jeden szkic ze wszystkimi tymi plikami.
- Bez szablonu z konkretnego maila. Gdy pierwszy odczyt złoży wszystko w jeden wpis, druga tura patrzy jeszcze raz na obrazy.

## 0.19.2 — Grok 4.6 widzi załączniki jako obrazy

- Wejście do Groka: JPEG stron PDF i zdjęcia jako `type: file` + `mediaType: image/jpeg` z etykietą nazwy (SDK 7; przestarzałe `type: image` Gateway odrzuca). Native PDF i GIF nie idą do modelu.
- Raster: do 8 stron PDF, krawędź 1920 px, jakość JPEG 85, max 16 obrazów w ładunku.
- Timeout `generateObject` 240 s po rasterze. `maxDuration` webhooka i replay 300 s (Fluid Hobby).
- Grok 4.6 na AI Gateway jest poza darmowym $5 — 403 „Free tier users do not have access to this model”, dopóki zespół nie ma płatnych kredytów Gateway.

## 0.19.1 — Grok 4.6 z myśleniem

- Model skrzynki: `spacexai/grok-4.6`, `reasoning: high` (łańcuch myślenia). Wcześniej `xai/grok-4.1-fast-non-reasoning`.
- Timeout `generateObject` 55 s, start po rasterze PDF. `maxDuration` webhooka 60 s (Hobby). `xhigh` nie wpinamy — nie mieści się w limicie.

## 0.19.0 — Grok widzi załączniki, intent, podmiana

- Wejście do Groka: tekst **oraz** obrazy (JPG/PNG/WebP/GIF, strony PDF jako JPEG, grafiki z DOCX). Tytuł ze sprawy na obrazku, nie z tematu „Plakaty”. Daty i nazwa jednostki z materiału / linii Jednostka — bez zgadywania miesiąca.
- Domyślnie **jeden** szkic. Kod nie wymusza podziału z nazw plików. Dwa–trzy szkice tylko gdy model widzi osobne sprawy.
- Intent `replace`: pewny cel → poprawka w panelu (wpis `draft` albo strona-szkic), produkcja bez zmian. Dwuznaczność albo nieczytelny materiał → brak wpisu, mail na allowlistę, Telegram bez Akceptuj.
- Timeout / błąd Gateway **nie** robi surowego importu 1:1. Webhook oddaje 200 od razu (`waitUntil`). Timeout modelu 45 s. Ponowny odczyt: `POST /api/admin/inbound/replay`.
- Migracja `setup:inbound-intent` (`post_id` puste, status `drafted | replaced | awaiting_clarification`). Plan: [PLAN-INBOUND-GROK.md](./PLAN-INBOUND-GROK.md).

## 0.18.1 — Grok nie skleja spokrewnionych spraw i nie dzieli po pliku

- Gdy w mailu są osobne sprawy (inny obowiązek / wydarzenie), druga tura Groka rozdziela je na 1–3 szkice. Jeden lead nie może wyliczać kilku spraw.
- Ujęcia tej samej sprawy (inny podtytuł, strona, format) zostają w jednym wpisie. Druga tura scala nadmiar; na końcu kod zlepia pliki o tym samym temacie w nazwie. Pismo do urzędu przy materiałach na stronę nie tworzy osobnego szkicu.
- Komunikat dla mieszkańców (plakat, sanepid, weterynaria) → `aktualnosci`. `ochrona-ludnosci` zostaje na stałe materiały kryzysowe.
- Ponowny odczyt tego samego maila: `POST /api/admin/inbound/replay` (kasuje poprzednie szkice z przesyłki i puszcza Groka jeszcze raz).

## 0.18.0 — Grok: forma treści i jednostka z hopu

- Grok dzieli mail na 1–3 szkice według komunikatu dla odbiorcy; plakat = podgląd; pismo przewodnie = `drop`; ogólnikowy tytuł odrzucany.
- Jednostka: domena hopu, który przekazał maila do Ciebie (nie envelope From, nie autor pisma). Mapa `INBOUND_SITE_BY_DOMAIN` / `INBOUND_SITE_BY_EMAIL`.
- Nadal tylko `draft`. Plan: [PLAN-INBOUND-GROK.md](./PLAN-INBOUND-GROK.md).

## 0.17.0 — Grok na skrzynce inbound

- Mail z allowlisty: Grok czyta treść oraz PDF/DOCX i proponuje tytuł, kategorię (z listy jednostki) i posprzątaną treść wpisu.
- Nadal tylko `draft`. Błąd / timeout Gateway = import 1:1 jak w 0.16.0 (pusta kategoria). Telegram wtedy pisze, że szkic jest surowy.
- Model domyślny: `xai/grok-4.1-fast-non-reasoning` (szybki, bez łańcucha myślenia — `xai/grok-4` zniknął z katalogu Gateway). Timeout 35 s, `maxDuration` webhooka 60 s. Env: `INBOUND_AI_MODEL`, `AI_GATEWAY_API_KEY` (lokalnie).
- DOCX bez pieczątki i podpisu: grafiki z `word/media` idą do galerii (pierwsza = zajawka), plik Word nie zostaje. Pieczęć EMF/WMF albo skan podpisu zostawia załącznik.

## 0.16.0 — Skrzynka inbound

- Mail z allowlisty na `wpisy@inbound.cncsolutions.dev` tworzy szkic (`draft`) na jednostce z env.
- Załączniki (JPEG/PNG/WebP/GIF/PDF/DOCX/XLSX/ZIP/GPKG) idą do Storage jak z panelu; zły plik zostawia notatkę w treści, nie kasuje szkicu.
- Telegram: „Szkic z poczty” + link do panelu, bez przycisku Akceptuj.
- MX wyłącznie na `inbound.cncsolutions.dev`. Migracja `setup:inbound-email`.

## 0.15.0 — Załączniki stron statycznych

- Strony statyczne mają te same panele co wpisy: PDF (link albo podgląd na stronie), DOCX, pliki do pobrania.
- Pliki idą do Storage i przy publikacji do folderu strony w repo Astro (`./plik` obok `index.md`).
- Import z GitHub zdejmuje linki z treści i odtwarza tryb wyświetlania PDF.
- Migracja `setup:page-assets`.

## 0.14.0 — Akceptacja z Telegrama

- Wiadomość o wpisie do akceptacji ma przyciski *Akceptuj* i *Otwórz w panelu*.
- *Akceptuj* publikuje tylko `pending` (szkic nadal z panelu). Odrzucenie i przypięcie — w panelu.
- Webhook: `POST /api/telegram/webhook`. Po deployu: `npm run setup:telegram-webhook`.

## 0.13.0 — Powiadomienie o wpisie do akceptacji

- Redaktor wysyła szkic → administrator dostaje wiadomość na Telegram (tytuł, strona, autor, link do `/admin/posts/{id}`).
- Bez tokenu submit działa jak wcześniej; odznaka w panelu i tak pokazuje liczbę oczekujących.
- E-mail o akceptacji/odrzuceniu nadal poza zakresem.

## 0.12.0 — Dodatkowe kategorie wpisu

- Wpis ma **jedną kategorię główną** (adres `/{kategoria}/{slug}`) i opcjonalnie dodatkowe.
- Przykład: główna *Mazowsze bez smogu*, dodatkowa *Aktualności* — wpis jest też na stronie głównej i w archiwum Aktualności.
- Migracja `setup:extra-categories`. Front-matter: opcjonalne `categories`.

## 0.11.0 — Auto-reconcile Omni ↔ GitHub

- Przy wejściu na kolejkę, listę wpisów i listę stron Omni sam wczytuje wpisy i strony z `origin/main`, gdy GitHub się zmienił i nie ma niewysłanych poprawek w Omni. Edytor szkicu nie powtarza tego importu.
- Publikacja strony odmawia pustki/placeholdera nad bogatszą treścią w repo.
- *Utwórz strony z menu* tworzy tylko szkice — nic nie idzie do Gita.
- Przyciski *Importuj z GitHub* usunięte. Migracja `setup:github-reconcile`.

## 0.10.0 — SSOT stylów UI

- Semantyczne tokeny w `src/styles/global.css` (`text`, `border`, `link`, `danger`, nav depth itd.).
- Partiale `ui/*.css` bez surowych `slate-*`; nowe: `typography.css`, `rich-content.css`, `layout-slots-preview.css`.
- Warianty przycisków: `ui-btn--link`, `ui-btn--link-danger`, `ui-btn--link-ghost`, `ui-btn--sm`.
- Migracja komponentów domenowych na klasy `ui-*`; linki w treści = kolor brand.
- PDF viewer i callback auth na tokenach CSS / `AuthLayout`.
- Lint: `npm run lint` — `tsc --noEmit`, ESLint TS oraz linty `scripts/lint-{ui-classes,docs-setup,i18n,layers,file-size}.mjs`; workflow CI `.github/workflows/ci.yml`.

---

## Powiązane dokumenty

- [ADMIN.md](./ADMIN.md) — jak używać panelu admina
- [REDAKTOR.md](./REDAKTOR.md) — jak używać panelu redaktora
- [WDROZENIE.md](./WDROZENIE.md) — bootstrap techniczny
- [PLAN-SP-MIEDZNA.md](./PLAN-SP-MIEDZNA.md) — destynacja SP Miedzna: repo, szablon, migracja WP, produkcja `sp-miedzna.pl` (cutover 2026-09-17)
- [../PRD.md](../PRD.md) — opis produktu (skrót)
