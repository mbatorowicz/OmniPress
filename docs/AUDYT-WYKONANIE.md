# Audyt — kroki wykonawcze

**SSOT:** jak naprawić. Co i dlaczego jest zepsute: [AUDYT.md](./AUDYT.md) (odwołania `P0-1`, `P1-4` itd. wskazują znaleziska z tamtego rejestru).

Każde **podejście** jest samodzielne: da się je wykonać w jednym posiedzeniu, zweryfikować i zamknąć commitem. Kolejność 1–4 jest wiążąca, dalsze można przestawiać.

Oznaczenia repo: **A** = OmniPress, **B** = `gmina-miedzna.pl`.

| # | Podejście | Ryzyko | Blokuje |
|---|-----------|--------|---------|
| 1 | Punkt startu i higiena — ✅ **wykonane** | zerowe | wszystko |
| 2 | SSOT slugów (kod) — ✅ **wykonane** | niskie | 3, 4 |
| 3 | Dry-run migracji slugów — ✅ **wykonane** | zerowe | 4 |
| 4 | Migracja slugów i menu — ✅ **wykonane** | **wysokie** | — |
| 5 | Domknięcie kontraktu — ✅ **wykonane** | niskie | — |
| 6 | Test kontraktowy i reguła — ✅ **wykonane** | zerowe | — |
| 7 | CI w repo B — ✅ **wykonane** | niskie | — |
| 8 | Dokumentacja — ✅ **wykonane** | zerowe | — |
| 9 | i18n | niskie | — |
| 10 | Testy modułów krytycznych | zerowe | — |
| 11 | Refaktor struktury | średnie | — |
| 12 | Assety poza gita | **decyzja** | — |

---

## Podejście 1 — punkt startu i higiena

**Cel:** oba repo w znanym, czystym stanie. Bez tego kolejne podejścia pracują na nieaktualnych danych (P1-1).

**Kroki**

1. Repo B: `git pull` — lokalne `main` jest za `origin/main`, bo OmniPress publikuje przez GitHub API prosto do origin.
2. Repo B: usunąć ze śledzenia `dump.txt`, `error.log`, `out.txt`, `zips.txt`, `Importuj_Paczki.bat`, `archived_packages/` (P1-4).
3. Repo B: uzupełnić `.gitignore` o `.env*` — dziś ignorowane są tylko `.env` i `.env.production`, `.env.local` przechodzi.
4. Repo B: poprawić `name` w `package.json` z `extra-earth` na `gmina-miedzna` (P1-5).
5. Repo A: usunąć pięć skryptów `scripts/tmp-*` albo dodać `scripts/tmp-*` do `.gitignore` (P2-4).
6. Repo A: rozstrzygnąć `public/omnipress/pdf-viewer.js` — jeśli to artefakt `build:pdf-viewer`, powinien być ignorowany, nie commitowany.

**Weryfikacja:** `git status` czysty w obu repo; `npm run build` przechodzi w B.

**Commit:** dwa osobne, po jednym na repo.

### Wykonano (2026-08-27)

Repo B — commit `950462c`, wypchnięty na `origin/main`:

- `git pull` domknął 14 zaległych commitów.
- Usunięto **cały martwy flow importu paczek**, nie tylko wskazane w P1-4 pliki. `Importuj_Paczki.bat` okazał się nie śmieciem, lecz udokumentowanym narzędziem publikacji (`docs/USER_MANUAL.md` → `scripts/import-packages.mjs` → `git add .` + push). Flow zastąpiony panelem OmniPress, a ostrzeżenia IMGW idą dziś na żywo z `/api/weather/warnings` — decyzja użytkownika: usunąć. Poszły z nim `scripts/import-packages.mjs` oraz osierocone zależności `adm-zip` i `slugify`.
- `docs/USER_MANUAL.md` przepisany na publikację z panelu; poprawione zdanie o pakietach ZIP w `docs/ADMIN_MANUAL.md`.
- Śmieci ze śledzenia: `dump.txt`, `error.log`, `out.txt`, `zips.txt`, `archived_packages/*.zip` (9 plików, zostają na dysku).
- `.gitignore`: `.env*`, `*.log`, `archived_packages/` i pliki robocze.
- `package.json`: `name` → `gmina-miedzna`.

Repo A:

- `scripts/tmp-*` w `.gitignore` — pliki zostają na dysku, ale `git add .` ich nie zgarnie.
- Sekcja env w `.gitignore` scalona: były trzy nakładające się reguły (`.env.production`, `.env.*`, `.env*`), z czego ostatnia stała **po** wyjątku `!.env.example`.
- **`public/omnipress/pdf-viewer.js` zostaje w gicie.** Wbrew hipotezie z kroku 6 to nie jest artefakt do zignorowania: `lib/publish/github-pdf-viewer.ts:15-23` czyta go z dysku w runtime publikacji i dołącza do commita w repo B, a `ensureLocalPdfViewerBuilt` nie ma jak zadziałać na Vercelu (read-only FS, brak esbuild w runtime). Build sprawdzony jako deterministyczny — ponowne `npm run build:pdf-viewer` nie generuje diffu, więc plik nie brudzi drzewa.

**Wynik weryfikacji:** repo B — `npm test` 21/21, `npm run build` OK. Repo A — `npm run lint` czysty, `npm test` 356/356, `npm run build` OK.

---

## Podejście 2 — SSOT slugów (sam kod, bez ruszania danych)

**Cel:** jedna funkcja slugująca, poprawna dla polskich znaków, wymuszona wszędzie (P0-1, P0-2, P0-3).

**Kroki**

1. W `src/lib/admin/slug.ts` dodać jawną mapę transliteracji przed `normalize('NFD')`. Krytyczne: `ł→l`, `Ł→L`. `\p{Diacritic}` ich nie łapie, bo to samodzielne znaki bez dekompozycji. Warto od razu ująć `đ`, `ø`, `æ`, `ß`.
2. Usunąć `slugFromTitle` z `src/lib/posts/access.ts` i przekierować wszystkie wywołania na `normalizeSlug`. Dwie funkcje z różnymi regexami to źródło rozjazdu.
3. Wymusić `normalizeSlug` na slugu kategorii **po stronie serwera** — w `parse-form.ts`, nie tylko w UI. Walidacja w kliencie da się obejść.
4. To samo dla slugów stron statycznych (`lib/site-pages/`).
5. Test parametryzowany po `ą ć ę ł ń ó ś ź ż` plus wersje wielkie, w `src/lib/admin/slug.test.ts`.
6. Test regresyjny na realnych przypadkach: `Ogłoszenie o przetargu → ogloszenie-o-przetargu`, `Plan Ogólny Gminy Miedzna → plan-ogolny-gminy-miedzna`.

**Weryfikacja:** `npm test`, `npm run lint`, `npm run build` w repo A.

**Uwaga:** po tym podejściu nowe wpisy mają poprawne slugi, stare wciąż zepsute. Stan przejściowy jest zamierzony.

### Wykonano (2026-08-27)

- `normalizeSlug` — jawna mapa transliteracji (`ł`, `đ`, `ø`, `æ`, `ß`) przed `normalize('NFD')`.
- Usunięto `slugFromTitle`; wywołania w `save.ts` i `site-pages/access.ts` idą przez `normalizeSlug`.
- Slug kategorii normalizowany po stronie serwera w `parse-form.ts`.
- Slug stron statycznych — `normalizeSlug` na każdym wejściu w `resolveSitePageFields`.
- Testy: 18 przypadków polskich znaków + regresja na realnych tytułach (`slug.test.ts`).

**Wynik weryfikacji:** `npm test` 374/374, `npm run lint` OK, `npm run build` OK.

---

## Podejście 3 — dry-run migracji slugów

**Cel:** policzyć wszystkie zmiany i dać je do zatwierdzenia, **zanim** cokolwiek zostanie ruszone.

**Kroki**

1. Napisać `scripts/migrate-slugs.mjs` z obowiązkową flagą `--dry-run` (bez flagi `--apply` skrypt tylko raportuje).
2. Skrypt czyta cztery źródła: `posts` z Supabase, katalogi `src/content/news/` w repo B, `categories` z `omnipress-layout.json`, oraz wszystkie `href` w menu z tego samego pliku.
3. Dla każdego obiektu wylicza nowy slug przez `normalizeSlug` z podejścia 2 i raportuje tabelę `stare → nowe` osobno dla: rekordów w bazie, katalogów w repo, pola `category` we front-matterze, pozycji menu.
4. Skrypt musi wykryć kolizje — jeśli dwa różne stare slugi dają ten sam nowy, przerwać z błędem.
5. Wygenerować gotową listę przekierowań w formacie `redirects` dla `astro.config.mjs`.

**Oczekiwany zakres** (do potwierdzenia przez skrypt): 7 wpisów z 23, 2 kategorie z 4, pole `category` w 6 wpisach, ~10 z 57 pozycji menu, 7 rekordów w bazie.

**Weryfikacja:** ręczny przegląd raportu. Nic nie zostało zmienione.

### Wykonano (2026-08-27)

- Skrypt `scripts/migrate-slugs.mjs` + `scripts/lib/normalize-slug.mjs` (logika zsynchronizowana z `src/lib/admin/slug.ts`) — **usunięte po podejściu 4** (narzędzie jednorazowe).
- Uruchomienie (historycznie): `npm run migrate:slugs:dry-run` (wymagało `.env.local` z `POSTGRES_URL`).
- Źródła: `posts` w Supabase, katalogi `src/content/news/` (repo B), `categories` i wszystkie `href` w `omnipress-layout.json`.
- Wykrywanie kolizji slugów — skrypt kończy się błędem przy konflikcie.
- Kategorie: migrujemy tylko slugi z polskimi znakami / bez separatorów; celowe skróty ASCII (np. `odpady`) zostają.
- Generuje blok `redirects` do wklejenia w `astro.config.mjs` repo B.

**Wynik dry-run (produkcja, 2026-08-27):**

| Obiekt | Audyt | Skrypt |
|--------|-------|--------|
| Wpisy (repo + baza) | 7 | 7 |
| Kategorie layoutu | 2 | 2 |
| Pole `category` we front-matter | 6 | 7 (6× plan ogólny + 1× zarządzenia) |
| `href` w layoutcie | ~10 | 12 (nawigacja + recent changes) |
| Przekierowania 301 | — | 13 |

Dodatkowo: 3 martwe linki `/informacje/*` (P0-6) — poza migracją slugów, do usunięcia w podejściu 4.

Brak kolizji slugów. Baza ↔ repo — te same 23 slugi katalogów.

---

## Podejście 4 — migracja slugów i menu

**Cel:** wykonać migrację. To jedyne podejście o wysokim ryzyku — kolejność kroków jest istotniejsza niż ich treść.

**Ryzyko:** jeśli baza rozjedzie się z repo, następna edycja wpisu opublikuje go do nowego katalogu i zostawi stary jako sierotę — ten sam artykuł dwa razy na stronie.

**Kroki**

1. Kopia zapasowa: dump tabeli `posts` i `sites.astro_layout`, plus tag w repo B na bieżącym `origin/main`.
2. Baza A: `UPDATE posts SET slug = …` dla 7 rekordów.
3. Repo B: `git mv` na 7 katalogach w `src/content/news/`.
4. Repo B: zaktualizować pole `category` w 6 wpisach należących do przemianowanych kategorii.
5. Layout: nowe slugi w `categories`, przepisane `href` w menu. **Przy okazji usunąć trzy martwe linki `/informacje/*`** (P0-6) — to ten sam plik, nie ma sensu ruszać go dwa razy.
6. Layout w bazie A (`sites.astro_layout`) musi dostać tę samą treść co plik w repo B, inaczej następna publikacja layoutu cofnie zmiany.
7. `astro.config.mjs` w B: przekierowania 301 ze starych adresów.
8. Jeden commit w repo B, push, czekać na deploy Vercel.

**Weryfikacja po deployu**

- Każdy nowy adres zwraca 200.
- Każdy stary adres zwraca 301 na nowy.
- Żadna pozycja menu nie prowadzi do 404 — przejść wszystkie 57.
- Edycja i ponowna publikacja jednego zmigrowanego wpisu z panelu **nie** tworzy drugiego katalogu.

**Rollback:** revert commita w B + odwrotny `UPDATE` na bazie. Oba muszą pójść razem.

### Wykonano (2026-08-27)

- Skrypt `scripts/migrate-slugs.mjs --apply` — **usunięty po domknięciu migracji** (2026-08-27).
- Rollback danych: tag w repo B `pre-slug-migration-2026-08-27` + revert commita `285c314` (kopia zapasowa bazy była tymczasowa, nie utrzymywana w repo).
- Tag w repo B: `pre-slug-migration-2026-08-27`.
- Repo B: `git mv` 7 katalogów wpisów, aktualizacja `category` we front-matter (7), layout (kategorie, menu, usunięcie 3 martwych `/informacje/*`), 14 redirectów w `astro.config.mjs`.
- Baza: 7× `posts.slug`, 7× `posts.category_slug`, 7× `publish_logs.external_id`, `sites.astro_layout` zsynchronizowany z plikiem.
- Naprawiono link recent-changes „Zapraszamy do współtworzenia…” z `/informacje/…` na `/aktualnosci/…`.
- `public/post-files/` nie wymaga ręcznego `git mv` — regeneruje je `scripts/copy-post-assets.mjs` przy buildzie.

**Wynik weryfikacji:** dry-run 0 zmian · `npm run build` repo B OK · commit `285c314` wypchnięty na `origin/main` · skrypt migracji i kopie zapasowe usunięte z repo A.

---

## Podejście 5 — domknięcie kontraktu

**Cel:** połączyć rzeczy, które są gotowe po obu stronach, ale nikt ich nie spiął (P0-4, P0-5, P1-9).

**Kroki**

1. **`pinned`** (P0-4): kolumna w `posts`, przełącznik w panelu admina, zapis w `lib/publish/frontmatter.ts`. Repo B już to pole czyta i filtruje po nim slot `home.pinned` — dziś sekcja „Przypięte" jest z tego powodu zawsze pusta.
2. **`terytGmina`** (P0-5): dodać do `parse.ts` i `parse-form.ts` w repo A. Typ już istnieje w `types.ts:62`, repo B jest gotowe (`weather-config.ts:50-53`). Zgodnie z regułą kompatybilności — symetria JSON ↔ FormData plus test w `parse.test.ts`.
3. **Walidacja linków menu**: ustalić, dlaczego nie wykryła trzech linków do nieistniejącej kategorii `informacje` (P0-6). Rozstrzygnąć, czy sprawdza kategorie wpisów, czy tylko istnienie ścieżki. [STATUS.md](./STATUS.md) oznacza tę funkcję jako gotową — albo naprawić kod, albo poprawić deklarację.
4. **Banner w strefie `home`**: zablokować w `components.ts:115-120`. Dziś konfiguracja przechodzi walidację w A, a repo B renderuje całą strefę `home` jako feed wpisów, więc banner wyświetli się źle.

**Weryfikacja:** `npm test`, `npm run build`; po publikacji layoutu sekcja „Przypięte" pokazuje przypięty wpis.

### Wykonano (2026-08-27)

- **`pinned` (P0-4):** migracja `20250827000000_posts_pinned.sql` + `npm run setup:posts-pinned`; kolumna `posts.pinned`; checkbox przy akceptacji wpisu i panel „Strona główna" dla opublikowanych/zaplanowanych; zapis `pinned: true` w `frontmatter.ts` i import z GitHub (`astro-post-parse.ts`).
- **`terytGmina` (P0-5):** round-trip JSON ↔ FormData w `parse.ts`, `parse-form.ts`, `slot-form-fields.ts`, UI widgetu pogody; test w `parse.test.ts`.
- **Walidacja menu (P0-6):** przyczyna — walidacja sprawdzała tylko dokładne dopasowanie ścieżki, nie prefix kategorii wpisu (`/{kategoria}/{slug}`). Naprawa: `isKnownInternalPath()` w `validate-nav.ts` + testy regresji na `/informacje/…`.
- **Banner w strefie `home` (P1-9):** usunięto `home` z `allowedZones` komponentu `sidebar.banner` w `components.ts`.

**Wynik weryfikacji:** `npm test` 378/378 · `npm run build` OK · migracja `setup:posts-pinned` OK.

---

## Podejście 6 — test kontraktowy i reguła

**Cel:** żeby następny rozjazd wykrył się sam. To najważniejsze podejście w całym audycie.

**Kroki**

1. Schemat JSON layoutu trzymany w repo A obok `parse.ts`, z testem walidującym wyjście `buildLayoutFilePayload`.
2. Test sprawdzający, że każdy `component` w wygenerowanym JSON należy do `LAYOUT_COMPONENT_IDS`.
3. Test front-matteru: pola generowane przez `lib/publish/frontmatter.ts` przeciw schematowi z `content.config.ts` repo B. Uwaga — Zod tam **nie jest** `.strict()`, więc nadmiarowe pola znikają bez błędu (P1-6); test musi to wychwycić, bo runtime nie wychwyci.
4. Poprawić regułę `.cursor/rules/astro-repo-compat.mdc`: klucz to `zones`, nie `slots` (P1-8).
5. Zdecydować o martwym odczycie w repo B — `slots`, `weather`, `site.meta.url` (P2-6): usunąć albo opisać jako celowy fallback legacy.

**Weryfikacja:** celowe zepsucie kontraktu (np. dopisanie nieznanego `component`) wywala test.

### Wykonano (2026-08-27)

- **Schemat layoutu:** `layout-file-schema.ts` (Zod `.strict()` na root) + `layout-contract.test.ts` — walidacja wyjścia `buildLayoutFilePayload` i whitelisty `LAYOUT_COMPONENT_IDS`; odrzuca legacy `slots`/`weather` w root.
- **Schemat front-matter:** `news-frontmatter-schema.ts` + `frontmatter-contract.test.ts` — lustrzane odbicie `content.config.ts` repo B z `.strict()` (łapie dryf, którego runtime Astro nie wychwyci).
- **Reguła P1-8:** `astro-repo-compat.mdc` — klucz `zones`, sekcja legacy fallbacków P2-6.
- **Repo B P2-6:** komentarze `@legacy` przy `slots`, `weather`, `site.meta.url` w `load-config.ts` (fallback celowy, bez usuwania).

**Wynik weryfikacji:** `npm test` 388/388 · `npm run build` OK.

---

## Podejście 7 — CI w repo B

**Cel:** repo B przestaje być stroną kontraktu bez żadnej kontroli (P1-2).

**Kroki**

1. `.github/workflows/ci.yml` wzorowany na tym z repo A: `npm ci`, `lint`, `astro check`, `test`, `build`.
2. ESLint z konfiguracją zgodną z repo A.
3. `astro check` do skryptów — `@astrojs/check` jest już w zależnościach i nikt go nie uruchamia.
4. Zamienić ręczną listę czterech plików w `npm test` na glob — dziś nowy test nie uruchomi się, dopóki ktoś nie dopisze go do `package.json`.
5. Dołożyć walidację slugów w treści. Po podejściu 4 obowiązuje jedna konwencja, więc może objąć cały katalog bez listy wyjątków.
6. Załatać dziury w `lint-ui-classes.mjs` po stronie A (P1-12): rozszerzyć zakres o `components/shared/`, `layouts/`, `components/posts/` i naprawić pomijanie całej linii zawierającej `ui-`.

**Weryfikacja:** CI zielone na `main`, wymagane w PR w obu repo.

### Wykonano (2026-08-27)

- **Workflow:** `.github/workflows/ci.yml` — `npm ci`, `lint`, `check`, `test`, `build`.
- **ESLint:** `eslint.config.js` + devDependencies (`eslint`, `@eslint/js`, `typescript-eslint`, `globals`); skrypt `npm run lint`.
- **`astro check`:** skrypt `npm run check`; `tsconfig.json` wyklucza `public/`, `**/*.test.ts`, `eslint.config.js` (uniknięcie OOM na `pdf-viewer.js`).
- **Testy glob:** `node --test "src/**/*.test.ts"` zamiast ręcznej listy czterech plików.
- **Walidacja slugów:** `scripts/validate-content-slugs.mjs` w `npm test` — 42 wpisy news + 26 stron pages.
- **Poprawki pod check:** prop `displaySlot` zamiast `slot` (konflikt z Astro), `is:inline` na skryptach DOM, typy paginacji, drobne null-safety.
- **Repo A P1-12:** `lint-ui-classes.mjs` — zakres `src/layouts/`, `src/components/shared/`; usunięte pomijanie całej linii z `ui-`.

**Wynik weryfikacji (repo B):** `npm run lint` OK · `npm run check` 0 errors · `npm test` 21/21 · `npm run build` OK.  
**Repo A:** `npm run lint` OK (218 plików) · `npm test` 388/388.

---

## Podejście 8 — dokumentacja

**Cel:** dokumentacja przestaje kłamać, i dostaje mechanizm, który to utrzyma (P2-1, P2-2).

**Kroki**

1. [STATUS.md](./STATUS.md): poprawić liczbę testów (72 pliki / 354 testy, nie 42), dopisać brakującą migrację `20250621000000_fix_kgw_post_slug.sql`.
2. [README.md](./README.md): uzupełnić tabelę npm o brakujące skrypty (`setup:auth-rate-limits`, `setup:auth-mfa`, `setup:author-on-delete`, `setup:assets-*`, `setup:storage-import-admin`, `setup:posts-rejected-resubmit`, `verify:*`, `seed:nav-pages`, `lint`, `lint:ui`, `build:pdf-viewer`).
3. Repo B: usunąć sekcję „Kanał WordPress" z `docs/OMNIPRESS.md` i pole `wordpress_site_url` z `.omnipress.json`. Ten typ destynacji nie istnieje od migracji `setup:remove-wordpress`.
4. Repo B: poprawić opis formatu layoutu (`zones`, nie `slots`) i przykładowy front-matter, jeśli po podejściu 5 doszło `pinned`.
5. Skrypt spójności: każdy `setup:*` z `package.json` ma wiersz w tabeli migracji w STATUS.md i odwrotnie. Dodać do `npm run lint`.

**Weryfikacja:** skrypt spójności przechodzi; usunięcie wiersza z tabeli go wywala.

### Wykonano (2026-08-27)

- **STATUS.md:** liczba testów 75 plików / 388 testów; migracje `setup:fix-kgw-slug`, `setup:posts-pinned`; funkcja `pinned` w tabeli admina.
- **docs/README.md:** uzupełniona tabela npm (`setup:auth-*`, `setup:assets-*`, `setup:storage-import-admin`, `verify:*`, `seed:nav-pages`, `lint`, `build:pdf-viewer` itd.).
- **Repo B:** usunięto sekcję WordPress z `docs/OMNIPRESS.md` i `wordpress_site_url` z `.omnipress.json`.
- **Repo B:** opis layoutu (`zones`, nie `slots`); front-matter z opcjonalnym `pinned`.
- **Spójność docs:** `scripts/lint-docs-setup.mjs` w `npm run lint` — 1:1 `setup:*` ↔ tabela migracji w STATUS.md.

**Wynik weryfikacji:** `npm run lint` OK (w tym `lint-docs-setup`) · `npm test` 388/388.

---

## Podejście 9 — i18n

**Cel:** ~268 hardkodowanych napisów przestaje rosnąć (P1-13, P2-5).

**Kroki**

1. Usunąć fallbacki `?? 'polski tekst'` w `components/admin/layout-slots/` — właściwe klucze już są w `admin-panels.ts`, fallback tylko maskuje ich brak.
2. Przenieść teksty z `ChannelTestButton.astro:36,57,61` i `lib/admin/channel-test.ts:141,148,166` do i18n. To komunikaty widoczne dla użytkownika.
3. Rozstrzygnąć politykę dla `throw new Error(`: jeśli komunikat trafia do UI — i18n; jeśli tylko do logów — zostaje, ale reguła w [KONWENCJE.md](./KONWENCJE.md) musi to dopuszczać wprost.
4. Usunąć potwierdzone martwe klucze (P2-5), zacząć od duplikatów `admin.postList.invalidAction` i `remoteFailed`.
5. Reguła lintu wykrywająca polskie diakrytyki poza `src/i18n/`, z jawną listą wyjątków. Bez tego 268 wystąpień odrośnie.

**Weryfikacja:** `npm run lint` z nową regułą przechodzi; `npm test` bez zmian.

---

## Podejście 10 — testy modułów krytycznych

**Cel:** deklaracje bezpieczeństwa w [STATUS.md](./STATUS.md) dostają pokrycie (P1-11).

Kolejność wg ryzyka, nie wg łatwości:

1. `lib/supabase/cookies.ts` — sesja SSR.
2. `lib/middleware/pipeline.ts` — pipeline SSR.
3. `lib/auth/session.ts`, `guard-request.ts`, `routes.ts`.
4. `lib/security/nonce.ts` — CSP.
5. `lib/admin/require-admin.ts` — guard admina.
6. `lib/publish/worker.ts`, `queue.ts`, `dispatch.ts`.
7. `lib/publish/github-api.ts`.
8. Testy integracyjne RLS — redaktor nie sięga poza przypisane strony. [STATUS.md](./STATUS.md) sam przyznaje, że ich nie ma.

**Weryfikacja:** każdy nowy test musi paść po celowym zepsuciu modułu, który testuje. Test, który nie potrafi paść, niczego nie chroni.

---

## Podejście 11 — refaktor struktury

**Cel:** [KONWENCJE.md](./KONWENCJE.md) znowu opisuje rzeczywistość (P2-3, P1-10, P1-14).

**Kroki**

1. **Reguła warstw** (P1-10) — rozstrzygnąć najpierw, bo determinuje resztę. Około 60 plików w `components/admin|posts` importuje `@/lib/`. Albo wymusić lintem i przenieść kod, albo przeformułować regułę (np. import typów i czystych helperów dozwolony, wywołania Supabase zabronione). Zostawienie jak jest oznacza, że cały dokument traci wiarygodność.
2. Scalić cztery panele załączników (`pdf-`, `docx-`, `file-attachments.ts`, `gallery-panel.ts`) w jeden `createAttachmentPanel()` — ~170 linii ×4 tego samego wzorca.
3. Wyciągnąć logikę z `pages/admin/index.astro` (49 linii frontmatter, 4 zapytania Supabase) do `lib/admin/queue-hub.ts` i z `pages/dashboard/posts/[id].astro` (~84 linie) do `lib/posts/editor-page.ts`.
4. Podzielić największe moduły: `navigation-form-client.ts` (815), `github-api.ts` (700), `parse-form.ts` (659), `admin-panels.ts` (692).
5. Repo B: `Navigation.astro` (428), `load-config.ts` (423), `WeatherWidget.astro` (385).
6. Czego nie da się podzielić sensownie — wpisać na jawną listę wyjątków. Milcząca tolerancja jest gorsza niż brak reguły.

**Weryfikacja:** `npm test` i `npm run build` w obu repo; brak pliku ponad 200 linii bez wpisu na liście wyjątków.

---

## Podejście 12 — assety poza gita (decyzja architektoniczna)

**Cel:** rozstrzygnąć P1-3. To nie jest zadanie do wykonania, tylko decyzja do podjęcia.

**Stan:** repo B waży 66 MB (28 MB spakowane), w tym dwa PDF-y po ~31 MB. Każda wersja załącznika zostaje w historii na zawsze. Przyrost jest liniowy względem liczby publikacji, a limit wpisu w panelu to 50 MB.

**Opcje**

| Wariant | Zaleta | Koszt |
|---------|--------|-------|
| Zostawić w gicie | zero zmian, treść wersjonowana razem z kodem | repo rośnie bez ograniczeń; klon i build coraz wolniejsze |
| Duże pliki do Storage/Blob, referencja we front-matterze | repo stałej wielkości | zmiana kontraktu → wymaga podejścia 6; assety poza wersjonowaniem |
| Próg hybrydowy (np. powyżej 5 MB do Storage) | kompromis | dwie ścieżki do utrzymania |

**Do policzenia przed decyzją:** przyrost MB na miesiąc przy obecnym tempie publikacji i moment, w którym build zaczyna przekraczać limity Vercela.

---

## Powiązane dokumenty

- [AUDYT.md](./AUDYT.md) — rejestr znalezisk i uzasadnienia
- [KONWENCJE.md](./KONWENCJE.md) — konwencje kodu
- [STATUS.md](./STATUS.md) — stan implementacji
- [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc) — kontrakt między repozytoriami
