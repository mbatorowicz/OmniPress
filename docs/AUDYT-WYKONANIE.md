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
| 9 | i18n — ✅ **wykonane** | niskie | — |
| 10 | Testy modułów krytycznych — ✅ **wykonane** | zerowe | — |
| 11 | Refaktor struktury — ✅ **wykonane** (repo A + repo B) | średnie | — |
| 12 | Assety poza gita — ✅ **rozstrzygnięte** (zostają w gicie) | **decyzja** | — |
| 13 | Typecheck w pipeline — ✅ **wykonane** | niskie | — |
| 14 | Walidacja wejścia w repo B — ✅ **wykonane** | niskie | — |
| 15 | Menu bez 404 + IA (Aktualności, Ochrona ludności) — ✅ **wykonane** | niskie | — |
| 16 | Walidacja menu bez self-check (P0-9) — ✅ **wykonane** | niskie | — |
| 17 | A11y / hamburger menu (P1-18) — ✅ **wykonane** | niskie | — |
| 18 | Treść GOPS / Biblioteka / Druki z WP — ✅ **wykonane** | średnie | po 15 |
| 19 | `aria-current` w menu górnym — ✅ **wykonane** | niskie | — |
| 20 | Pułapka fokusu wyszukiwarki — ✅ **wykonane** | niskie | — |
| 21 | Stopka: martwe linki prawne + walidacja — ✅ **wykonane** | niskie | — |

---

## Następna sesja

Podejścia 1–21 zamknięte 2026-09-04. Audyt jest domknięty.

**DNS cutover jest ostatnim krokiem projektu, nie następną sesją.** Domena produkcyjna `gmina-miedzna.pl` zostaje na starym hostingu do odwołania. Nowa strona działa pod `gmina-miedzna.cncsolutions.dev`.

**Start sesji:** `git pull` w repo B (SSOT = `origin/main`).

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

### Wykonano (2026-08-27)

- **layout-slots:** usunięto fallbacki `?? 'polski tekst'` — klucze tylko z `adminLayout` / `fields`.
- **ChannelTestButton + channel-test.ts:** komunikaty UI w `adminDestinations.channelTest` (+ `client` dla skryptu).
- **admin.ts:** usunięto martwe duplikaty `postList.invalidAction` i `postList.remoteFailed` (SSOT: `bulkErrors.*`).
- **admin-panels.ts:** brakujące pola formularza (`siteMeta*`, `headerBrand*`, `localFeedEntriesHint`).
- **KONWENCJE.md:** polityka `throw new Error` (UI → i18n; logi → dowolny język).
- **lint-i18n.mjs** + `scripts/i18n-exceptions.json` — zero tolerancji w `layout-slots/`, `ChannelTestButton`, `channel-test.ts`; legacy w jawnej liście wyjątków.

**Wynik weryfikacji:** `npm run lint` OK · `npm test` 388/388.

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

### Wykonano (2026-08-27)

**Nowe testy — 238 przypadków w 13 plikach:**

| Moduł | Plik testu | Przypadki |
|-------|-----------|-----------|
| `supabase/cookies.ts` | `cookies.test.ts` | 15 |
| `middleware/pipeline.ts` | `pipeline.test.ts` | 36 |
| `auth/routes.ts` | `routes.test.ts` | 28 |
| `auth/session.ts` | `session.test.ts` | 10 |
| `auth/guard-request.ts` | `guard-request.test.ts` | 11 |
| `security/nonce.ts` | `nonce.test.ts` | 5 |
| `admin/require-admin.ts` | `require-admin.test.ts` | 5 |
| `publish/queue.ts` | `queue.test.ts` | 24 |
| `publish/dispatch.ts` | `dispatch.test.ts` | 8 |
| `publish/worker.ts` | `worker.test.ts` | 13 |
| `publish/github-api.ts` | `github-api.{config,read,write}.test.ts` + rozszerzony `.ref` | 61 |
| RLS (integracyjne) | `supabase/rls.integration.test.ts` | 22 |

Wspólne narzędzia testowe: `src/lib/testing/supabase-fake.ts` (chainowalny, thenable klient Supabase z rejestrem zapytań) i `src/lib/testing/fetch-fake.ts` (router `fetch` sterowany testem).

**Cztery defekty wykryte przez nowe testy — wszystkie naprawione:**

1. **P0-7 — brak migracji `setup:profiles-guard` na produkcji.** Trigger blokujący eskalację uprawnień nie istniał w bazie, mimo ✅ w STATUS.md. Redaktor mógł ustawić sobie `role = 'admin'`. Migracja zastosowana; test eskalacji przechodzi. Szczegóły: [AUDYT.md](./AUDYT.md) §P0-7. Pozostałe 24 migracje zweryfikowane — obecne.
2. **`cookies.ts` — skasowane ciasteczko wracało z `getAll`.** `setAll` z pustą wartością odkładało wpis do `pending`, ale `getAll` scalał tylko wartości niepuste, więc token sprzed wylogowania nadal wygrywał w tym samym żądaniu. Dodane `merged.delete(name)`.
3. **`pipeline.ts` — API admina bez MFA dostawało 302 zamiast 403 JSON.** Blok przekierowania HTML łapał też `/api/admin/*`, więc `fetch` w panelu dostawał stronę HTML zamiast błędu, a gałąź `api.admin.mfaRequired` była martwym kodem. Przekierowanie ograniczone do tras HTML.
4. **`github-api.ts` — `httpStatusFromError` nie rozpoznawał części komunikatów.** Regex wyliczał czasowniki i dopuszczał tylko `POST`/`PATCH` jako drugi token, więc `GitHub ref GET 404` i `GitHub DELETE 404` dawały `null` → `retryable: true`. Trwałe błędy konfiguracji (zły branch, zły token) były ponawiane cztery razy. Dopasowanie uogólnione, plus 11 przypadków regresji w `github-api.ref.test.ts`.

**Testy RLS — świadomy opt-in.** Uruchamiają się tylko z `RLS_TEST_DATABASE_URL`; bez zmiennej `npm test` je pomija (22 skipped), żeby nikt przypadkiem nie połączył się z produkcją. Cała sesja biegnie w jednej transakcji zakończonej `ROLLBACK`, a każdy przypadek ma własny `savepoint` — udana eskalacja w jednym teście nie zmienia uprawnień w następnym. Zakres: izolacja wpisów między redaktorami, wstawianie na nieprzypisanej stronie, podszywanie się pod autora, samodzielna publikacja, dostęp do `destinations` (tokeny), `profiles`, `user_sites`, `sites`, `publish_logs` oraz cztery ścieżki eskalacji uprawnień.

**Weryfikacja mutacyjna.** Jednorazowy runner nałożył 24 mutacje na osiem modułów (m.in. usunięcie warunku `status = 'pending'` przy zajmowaniu logu, wpuszczenie redaktora do `/admin`, stały nonce CSP, brak odzyskiwania zawieszonych logów, powrót do starego regexu statusu). **24/24 wykryte** — każdy zepsuty moduł wywalił swój test. Narzędzie usunięte po weryfikacji.

**Wynik weryfikacji:** `npm test` 626/626 (+22 RLS opt-in, zielone na produkcyjnej bazie) · `npm run lint` OK · `npm run build` OK.

**Poza zakresem** (świadomie, wchodzi w podejście 11 razem z refaktorem): `github-astro.ts`, `admin/posts.ts`, `astro-layout/store.ts`, `site-pages/access.ts`.

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

### Wykonano (2026-08-27) — repo A

**1. Reguła warstw (P1-10) — przeformułowana i wymuszona lintem.** `components/**` nie sięga po dane: wolno importować typy, czyste helpery i skrypty klienta, nie wolno modułu operującego na kliencie Supabase (bezpośrednio lub przez łańcuch importów). Pilnuje tego `scripts/lint-layers.mjs`, który **wylicza zbiór modułów danych z grafu importów** zamiast trzymać listę do ręcznej aktualizacji — nowy moduł z Supabase obejmuje regułę sam. Flaga `--explain` pokazuje łańcuch, który zakwalifikował plik.

Lint wymusił rozdzielenie modułów mieszających czystą logikę z zapytaniami — stąd wzorzec `foo-model.ts` (kształt danych, predykaty, adresy) obok `foo.ts` (baza): `posts/asset-model.ts` ↔ `posts/assets.ts`, `publish/asset-model.ts` ↔ `publish/assets.ts`, `astro-layout/validate-nav.ts` ↔ `astro-layout/nav-known-paths.ts`.

**2. Panele załączników (P1-14) — cztery kopie w jednej fabryce.** `createAttachmentPanel()` obsługuje wspólny cykl (kolejność, usuwanie, upload, stan pusty), a wywołujący dostarcza render pojedynczego elementu. PDF, DOCX i pliki ogólne dzielą `file-attachment-panel.ts`; galeria ma własny render. Usunięte `pdf-attachments.ts`, `docx-attachments.ts`, `file-attachments.ts` oraz `appendGalleryAsset` bez wywołań. 12 testów w `attachment-panel.test.ts`; test przełącznika stanu pustego zweryfikowany mutacją.

**3. Logika z tras do `lib/`.** `admin/index.astro` → `admin/queue-hub.ts`, `dashboard/posts/[id].astro` → `posts/editor-page.ts`, `admin/posts/[id].astro` → `admin/post-review-page.ts` + `post-review-flash.ts`; wspólny podgląd wpisu w `posts/post-preview.ts`.

**4. Podział modułów ponad limit.**

| Plik | Przed | Po | Rozbity na |
|------|------:|---:|-----------|
| `admin/navigation-form-client.ts` | 912 | 98 | `nav-form-` {labels, dom, fields, dropdown, markup, summary, rows, events} |
| `astro-layout/parse-form.ts` | 736 | 170 | `parse-form-` {fields, widgets, footer, slots, nav, categories} |
| `publish/github-api.ts` | 775 | 39 (barrel) | `github-api-` {config, read, commit, write, delete, list} |
| `i18n/pl/admin-panels.ts` | 692 | 12 (barrel) | 9 modułów domenowych |

Przy `github-api.ts` trzy niemal identyczne pętle „tree → commit → PATCH refa z ponowieniem" zeszły do jednego `commitTreeEntries()`; przy okazji `deleteGitHubFilesBatch` zyskał ponawianie przy konflikcie tipu, którego wcześniej nie miał. Z `navigation-form-client.ts` wypadły trzy martwe eksporty `@deprecated` — w tym `initNavigationRowFromServerState` z 35 liniami polskich etykiet zaszytych w kodzie wbrew SSOT i18n.

**6. Lista wyjątków rozmiaru.** `scripts/lint-file-size.mjs` (limit 200) plus `scripts/file-size-exceptions.json`, gdzie każdy wpis ma **własny limit i uzasadnienie**. Limit jest ciasny, więc plik z listy nie może rosnąć; skrypt zgłasza też wpisy nieaktualne, gdy plik zmalał lub zniknął. Uzasadnienie z prefiksem `DŁUG P2-3` oznacza plik czekający na podział, nie zaakceptowany rozmiar. Stan: 18 wyjątków, w tym 2 trwałe (SSOT typów i lista ID komponentów).

**Cztery defekty znalezione przy okazji — naprawione:**

1. **`componentToKind()` wywoływał nieistniejącą funkcję.** `layout-slots-sections.ts` używa `getComponentKind` bez importu → `ReferenceError` w przeglądarce przy każdym wywołaniu z `layout-slots-client.ts` (rozpoznanie typu banera, budowa panelu slotu).
2. **Etykieta „TERYT gminy" renderowała się jako `undefined`.** Klucz i18n istniał, ale `layout-slots-client-vars.ts` go nie przekazywał, a `SectionFieldLabels` nie miał pola.
3. **Checkbox „Wł." na karcie slotu bez atrybutu `form`.** `buildSlotCardHtml` wołało `fa(config)` na obiekcie bez `formId`, więc karta dodana po stronie klienta poza znacznikiem formularza nie wysyłała `slot_enabled_*`. Przy okazji tekst „Wł." wyszedł z kodu do `adminLayout.slotCardEnabledShort` (klucz istniał, nieużywany), a martwy parametr `disabledLabel` zniknął.
4. **Typy w modułach wyciągniętych z tras.** `queue-hub.ts` deklarował `SiteRow` (wiersz przypisania) zamiast `Site`, `post-review-page.ts` mylił `SiteDestinationLink` z `DestinationForPublish`.

**Skąd te defekty:** `npm run lint` to ESLint bez sprawdzania typów, a `astro build` używa esbuild, który typów nie weryfikuje. **W repo nie ma kroku typecheck** — `npx tsc --noEmit` daje 148 błędów w 52 plikach. Trzy powyższe defekty siedziały w kodzie, bo nic ich nie pytało. Osobne podejście: [Podejście 13](#podejście-13--typecheck-w-pipeline).

**Wynik weryfikacji:** `npm test` 638/638 (+22 RLS opt-in) · `npm run lint` OK · `npm run build` OK.

### Wykonano (2026-08-27) — repo B, krok 5

**Trzy pliki z tabeli P2-3 zeszły poniżej limitu:**

| Plik | Przed | Po | Rozbity na |
|------|------:|---:|-----------|
| `config/load-config.ts` | 428 | 21 (barrel) | `layout-types`, `layout-payload`, `layout-slots`, `categories` + czyste: `nav-dropdown`, `category-archive`, `banner`, `home-slots`, `recent-changes` |
| `components/Navigation.astro` | 428 | 55 | `nav/NavDropdown.astro`, `lib/navigation/nav-menu-client.ts`, `styles/navigation.css` |
| `components/WeatherWidget.astro` | 385 | 47 | `styles/weather-widget.css` |

**Granica podziału `load-config.ts`: czysta logika ↔ odczyt JSON.** Moduły `nav-dropdown`, `banner`, `category-archive`, `home-slots`, `recent-changes` nie importują `omnipress-layout.json`, więc dają się uruchomić w `node --test` bez bundlera — stąd **39 nowych testów** (21 → 60). Wcześniej ta logika była nietestowalna, bo jeden plik mieszał typy, predykaty i odczyt pliku.

**CSS wyniesiony do arkuszy, nie schowany.** `weather-widget.css` był już `<style is:global>` — treść widgetu wstrzykuje `weather-client.ts`, więc scoped style Astro jej nie obejmują; arkusz to jego właściwe miejsce. `navigation.css` musi być globalny, bo obejmuje markup dwóch komponentów (`Navigation` + `NavDropdown`). Oba arkusze mają jawny wpis na liście wyjątków rozmiaru — limit w repo B liczy też `.css`, żeby przeniesienie nie było ucieczką przed licznikiem.

**Skrypt menu: `is:inline` → bundlowany moduł.** `nav-menu-client.ts` jest typowany (`astro check` go widzi) i idempotentny (`data-nav-mounted`). Zniknął `DOMContentLoaded` — moduł `type="module"` jest odroczony i renderowany za markupem, co potwierdzono w zbudowanym HTML.

**Bramka rozmiaru w repo B.** `scripts/lint-file-size.mjs` + `scripts/file-size-exceptions.json` (odpowiednik repo A, zakres poszerzony o `.css`) w `npm run lint`, czyli od razu w CI. Stan: 8 wyjątków, z czego 5 to `DŁUG P2-3` (`[category]/[slug].astro`, `Footer.astro`, `kontakt.astro`, `weather-client.ts`, `fetch-osmet.ts`), 3 to arkusze CSS z uzasadnieniem.

**Martwy kod ze startera Astro usunięty:** `components/Welcome.astro` (211 linii, zero referencji) razem z `assets/astro.svg` i `assets/background.svg` — plik ponad limit zniknął, zamiast dostać wyjątek. `README.md` opisywał właśnie te pliki jako strukturę projektu; przepisany na realną strukturę, komendy (`lint`, `check`, `test`) i mapę modułów `config/`.

**Weryfikacja równoważności — build przed i po.** Zbudowano repo B na `HEAD` (stash) i po zmianach, potem porównano wszystkie 59 stron HTML po normalizacji hashy assetów i klas scoped Astro: **58 identycznych**, jedna różnica na `index.html` to wyłącznie kolejność inline'owanych bloków `<style>` (te same 27 reguł, selektory rozdzielone atrybutem `data-astro-cid`, więc kaskada bez zmian). Osobno porównano CSS reguła po regule względem `HEAD`: nawigacja 42/42, widget pogody 66/66 — identyczne selektory i deklaracje.

**Weryfikacja mutacyjna bramki rozmiaru:** nowy plik 210 linii, plik z wyjątku ponad swój limit, wyjątek dla nieistniejącego pliku — wszystkie trzy przypadki wywaliły `lint-file-size` (exit 1); sondy usunięte.

**Wynik weryfikacji (repo B):** `npm run lint` OK (72 pliki, 8 wyjątków) · `npm run check` 0 errors · `npm test` 60/60 · `npm run build` OK.

**Pozostaje:** 16 wpisów `DŁUG P2-3` w repo A i 5 w repo B — **zamknięte 2026-09-04** (podział wszystkich plików z prefiksem `DŁUG`; wyjątki to wyłącznie SSOT i arkusze CSS).

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

### Decyzja (2026-08-27): assety zostają w gicie

**Moment przekroczenia limitów Vercela nie nadejdzie tą drogą — limit 100 MB jest limitem pojedynczego pliku, nie sumy źródeł.** Dokumentacja Vercela („maximum size of the *source files* that can be uploaded is limited to 100 MB for Hobby") czyta się jak limit sumy i tak trafiła do stanu wyjściowego tego podejścia. Zweryfikowane czterema deployami projektu (plan **hobby**):

| Wysłane źródła | Wynik |
|---|---|
| 99,6 MB (stan repo) | READY |
| 101,5 MB (repo + sonda 2 MB) | READY |
| jeden nowy plik 105 MB | `File size limit exceeded (100 MB)` |
| 106 MB w dwóch plikach po 53 MB | READY |

Panel OmniPress przyjmuje maksymalnie 50 MB na załącznik (`MAX_FILE_ATTACHMENT_BYTES`), a GitHub odrzuca plik powyżej 100 MB — więc żadna publikacja z panelu nie może samodzielnie przekroczyć limitu platformy.

**Zmierzony stan i tempo**

| Miara | Wartość |
|---|---|
| Repo B w `HEAD` | 201 plików, 99,55 MB — z tego załączniki wpisów 96,06 MB (96%), kod i konfiguracja 3,46 MB |
| Historia gita | 864 blobów, 120,07 MB nieskompresowane; `size-pack` 28,34 MB |
| PDF-y w całej historii | 85,54 MB w 30 obiektach (71% wagi historii) |
| Rozkład załączników w `HEAD` | 2 pliki > 10 MB = 60,39 MB (63%); 19 plików < 0,5 MB = 3,65 MB; mediana na wpis 1,39 MB |
| Przyrost miesięczny | 06: 9,03 MB · 07: 84,36 MB · 08: 4,68 MB |
| Build repo B | 8,4 s lokalnie |

**Przyrost nie jest liniowy względem liczby publikacji, jak zakładał opis P1-3.** Lipcowe 84 MB to w 70 MB **jeden** wpis („Ogłoszenie o przekazaniu Planu Ogólnego…", 5 PDF-ów, dwa po ~30 MB), a sierpień z ośmioma publikacjami dał 4,68 MB. Repozytorium rośnie od pojedynczych dokumentów urzędowych, nie od kadencji redakcji — mediana wpisu to 1,4 MB.

**Dlaczego nie Storage.** Załączniki **już** są w Supabase Storage: bucket `post-assets` waży 82,63 MB (312 plików), a publikacja pobiera je stamtąd HTTP-em i dokłada do commita (`collectPostAssetWrites` w `lib/publish/github-astro.ts`). Wariant „duże pliki do Storage" nie wymagałby więc nowej infrastruktury, tylko rezygnacji z kopiowania — ale przeniósłby ruch publiczny z Vercela (100 GB/mies. na hobby) na Supabase, gdzie plan free daje 5 GB, czyli pułap **20× niższy**. Do tego repo przestałoby być samowystarczalne: dziś plik w gicie wystarcza, żeby strona się zbudowała i działała. Przy okazji: dwóch PDF-ów po 30 MB **nie ma już w Storage** (największy tam to 4,23 MB), choć weszły przez panel (commit `cc9da70`) — dla tych plików git jest dziś jedyną kopią, nie duplikatem.

**Wariant hybrydowy (próg np. 5 MB) odrzucony**, bo kosztuje dwie ścieżki publikacji i dwa źródła prawdy o jednym wpisie, a nie zamyka żadnego realnego problemu: limit nie grozi, a transfer zostaje taki sam.

### Prawdziwy koszt siedział w transferze, nie w repozytorium

Szukając momentu przekroczenia limitów, znalazł się ten, który był płacony **codziennie**. Wpis o planie ogólnym osadza 5 viewerów PDF o łącznej wadze **69,98 MB** (zmierzone `Content-Length` na produkcji `gmina-miedzna.cncsolutions.dev`). Dwie rzeczy składały się na to, że wejście na stronę pobierało wszystkie:

1. **`pdfDocumentOptions` wyłączało czytanie zakresami dla całego same-origin.** Wyjątek powstał dla podglądu w panelu — `/api/posts/{id}/assets/{assetId}/file` odpowiada całym body bez `Accept-Ranges`, więc pdf.js musi tam pobrać plik jednym żądaniem. Warunek `src.startsWith('/')` obejmował jednak także statyczne załączniki strony, których adres po przepisaniu przez `rehypePostAssetUrls` wygląda `/post-files/<slug>/<plik>.pdf`. Produkcja podaje na nich `Accept-Ranges: bytes`, ale viewer sam z tego rezygnował i ściągał pełne 30 MB, żeby pokazać pierwszą stronę.
2. **`mountPdfViewers` montowało wszystkie widgety naraz**, bez oglądania się na widok — pięć równoległych pobrań przy wejściu.

Przy 100 GB transferu w planie hobby **~1430 odsłon tego jednego wpisu wyczerpywało miesięczny limit**. Naprawa:

- `pdf-viewer/document-options.ts` — czysta funkcja; pełne pobranie i `withCredentials` **tylko** dla `/api/posts/{id}/assets/{assetId}/file` (dopasowanie po `pathname`, więc obcy host udający tę ścieżkę nie dostaje cookie). Reszta czyta zakresami. 9 testów.
- `pdf-viewer/lazy-mount.ts` — `IntersectionObserver` z `rootMargin` 300 px, montaż dokładnie raz, natychmiastowy fallback bez obserwatora. 5 testów; test „montuje tylko raz" wyłapał, że pierwotna wersja polegała wyłącznie na `disconnect()`.
- `mountPdfViewers` znaczy widget atrybutem `data-op-pdf-pending` — bez tego powtórne wywołanie (panel po zmianie treści) zawieszałoby drugi obserwator na tym samym elemencie, bo `data-op-pdf-mounted` pojawia się dopiero przy wejściu w widok.

Artefakt `public/omnipress/pdf-viewer.js` przebudowany i **wypchnięty do repo B ręcznie** — normalnie dokłada go publikacja wpisu z embedem (`preparePdfViewerWrites`), a ta naprawa musi zadziałać bez czekania na kolejną publikację.

### Bramka: decyzja z datą ważności

`scripts/lint-content-weight.mjs` w repo B (w `npm run lint`, czyli w CI) waży załączniki `src/content/**` przy każdym buildzie i wypisuje stan względem progu. Dwa progi odpowiadają realnym granicom, nie okrągłym liczbom:

- **50 MB na plik** — tyle przyjmuje panel. Cięższy plik znaczy, że wszedł inną drogą i wymaga wyjaśnienia.
- **300 MB sumy** — trzykrotność stanu z dnia decyzji; przy zmierzonym tempie (~10 MB/mies. medianowo, ~33 MB z miesiącami ciężkich dokumentów) daje kilkanaście miesięcy. Komunikat odsyła do tego podejścia, żeby warianty przeliczyć na aktualnych danych, zamiast odziedziczyć dzisiejszy wniosek.

Stan: `36 załączników, 96.1 MB — 32% progu 300 MB; największy 30.2 MB`. Weryfikacja mutacyjna: sonda 51 MB i sondy podnoszące sumę do 312 MB wywaliły lint (exit 1), obie zgłoszone właściwym komunikatem; sondy usunięte.

**Otwarta niepewność:** plan Supabase nie został potwierdzony w panelu — bilans transferu opiera się na limitach planu free (5 GB egress, 1 GB Storage; bucket zajmuje dziś 82,63 MB, czyli 8%). Gdyby projekt był na planie Pro, argument „Storage ma 20× niższy pułap" traci moc, ale pozostałe powody (samowystarczalność repo, brak zagrożenia limitem, transfer naprawiony u źródła) nie zależą od planu.

**Higiena repo B przy okazji:** usunięte pliki robocze z podejść 4–11 (siedem `scripts/tmp-*.mjs`, `file-size-exceptions.new.json` — bajt w bajt kopia pliku aktualnego), a `.gitignore` dostał `scripts/tmp-*` i `*.tmp`, żeby nie wracały przez `git add .` (symetrycznie do repo A z podejścia 1).

**Wynik weryfikacji:** repo A — `npm run typecheck` 0 błędów · `npm run lint` OK · `npm test` 652/652 (+22 RLS opt-in) · `npm run build` OK. Repo B — `npm run lint` OK (72 pliki, 8 wyjątków; waga treści 32% progu) · `npm run check` 0 errors · `npm test` 60/60 · `npm run build` OK.

---

## Podejście 13 — typecheck w pipeline

**Cel:** żaden błąd typów nie dojeżdża na produkcję (P1-15, znalezione w podejściu 11).

**Stan wyjściowy:** `npm run lint` uruchamiał ESLint bez reguł wymagających typów, a `astro build` kompiluje esbuildem, który typów nie sprawdza. `npx tsc --noEmit` dawał **148 błędów w 52 plikach**. Trzy realne defekty UI naprawione w podejściu 11 przeszły do repo właśnie tędy.

**Kroki**

1. `npm i -D @types/node` + `types: ["node"]` w `tsconfig.json` — znaczna część błędów to nierozpoznane `Buffer`, `process`, `node:*`.
2. Skrypt `npm run typecheck` (`tsc --noEmit`) i dopięcie go do `npm run lint`, żeby jeden `lint` był bramką.
3. Zejście z listy błędów w kolejności ryzyka: najpierw kod produkcyjny (`src/lib/**`, `src/pages/**`), potem testy.
4. Do czasu wyzerowania — baseline w stylu listy wyjątków rozmiaru plików: plik z baseline nie może dostać nowych błędów.

**Weryfikacja:** `npm run typecheck` bez błędów poza jawnym baseline; celowe zepsucie typu w losowym module wywala `npm run lint`.

### Wykonano (2026-08-27)

**Baseline nie był potrzebny — repo schodzi z 148 błędów na zero.**

**Dlaczego było ich 148, a `tsc` widział jeden.** TypeScript 6.0.3 przerywa na `tsconfig.json`: `baseUrl` jest deprecated i podniesione do błędu, więc kompilator nie dochodził nawet do kodu. Po usunięciu `baseUrl` (`paths` działają relatywnie do tsconfiga) wyszło **85 błędów w 37 plikach**.

**Najważniejsze znalezisko: `App.Locals` nigdy nie był typowany.** Deklaracja leżała w `src/middleware.d.ts` — obok `src/middleware.ts`. TypeScript uznaje taki plik za deklarację wyjściową tego modułu i **pomija go w programie** (potwierdzone `tsc --listFiles`). Interfejs `Locals` pozostawał więc pusty jak z `astro/client`, a `locals.user`, `locals.profile`, `locals.supabase` i `locals.cspNonce` były nietypowane w całym middleware, guardach i trasach API. Deklaracja przeniesiona do `src/app.d.ts` (nazwa nie koliduje z modułem) i owinięta w `declare global` — bez tego namespace zostawał lokalny, bo plik ma importy. Sam ten jeden ruch zdjął 32 błędy.

**Trzy defekty w kodzie produkcyjnym, których nikt nie pytał:**

1. **`adminSites.astroHelp` nie istnieje — klucz należy do `adminUnit`.** `channel-test.ts` i `destinations.ts` czytały `adminSites.astroHelp.tokenClassicWarning` → `TypeError` w runtime. Skutek: test kanału GitHub z classic PAT (`ghp_…`) wywalał się zamiast ostrzec, a komunikaty o dostępie tokena do repo nigdy nie dochodziły do UI — `try/catch` wokół audytu tokena zjadał wyjątek.
2. **`zones` gubione przy każdym ogłoszeniu i przy porównaniu ze stroną live.** `recent-changes/github.ts`, `recent-changes/store.ts` i `layout-sync-meta.server.ts` składały `SiteAstroLayout` z płaskich slotów, bez `zones`. Runtime odtwarzał strefy przez `migrateFlatSlotsToZones`, czyli po **domyślnej** strefie komponentu. `sidebar.weather`, `sidebar.cert_advisories` i `sidebar.banner` wolno postawić w stopce — takie komponenty wracały do sidebara przy publikacji ogłoszenia, a hash pliku live nie zgadzał się z hashem szkicu, więc panel bez powodu pokazywał „Strona zmieniona poza OmniPress". Wszystkie trzy ścieżki przepuszczają teraz `zones` bez zmian.
3. **`layout-editor-status.ts` deklarował typ węższy niż i18n.** Parametr `draftStatus` nie miał `inSyncCombined`, mimo że klucz istnieje i jest używany.

Do tego `admin/github-token.ts` importował nieistniejący typ `GitHubRepoConfig` (jest `GitHubConfig`), a cztery zapytania z embedem Supabase były rzutowane wprost, mimo że klient bez wygenerowanych typów zgaduje relację many-to-one jako tablicę — `getUserSites` dostał wreszcie jawny `Promise<SiteRow[]>`, więc rzutowanie jest w jednym miejscu, nie w każdej trasie.

**Reszta (33 błędy) to fixture'y testowe** — niepełne obiekty `SiteAstroLayout`, `GitHubConfig` bez `assetPublicBase`, `Uint8Array` bez parametru `ArrayBuffer` (WebCrypto i `BlobPart` wymagają widoku nad `ArrayBuffer`, goły typ obejmuje `SharedArrayBuffer`), brak `@types/pg`.

**Bramka:** `npm run typecheck` (`tsc --noEmit`) jako pierwszy krok `npm run lint`, więc CI już ją uruchamia bez zmian w workflow. `typescript`, `@types/node` i `@types/pg` weszły jako jawne devDependencies — `tsc` był dotąd zależnością przechodnią, bez kontroli wersji.

**Weryfikacja mutacyjna:** sonda z dostępem do nieistniejącego pola `Locals` i przypisaniem `string` do `number` wywaliła `npm run typecheck` (exit 2, oba błędy wskazane); sonda usunięta.

**Wynik weryfikacji:** `npm run typecheck` 0 błędów · `npm run lint` OK · `npm test` 638/638 (+22 RLS opt-in) · `npm run build` OK.

---

## Podejście 14 — walidacja wejścia w repo B

**Cel:** repo Astro przestaje przyjmować zapisy z panelu na słowo (P1-9, P1-6). Ostatnia asymetria kontraktu: OmniPress waliduje to, co wysyła, a strona brała plik i front-matter bez pytania.

**Kroki**

1. Walidacja `omnipress-layout.json` przed pierwszym odczytem, z whitelistą ID komponentów.
2. `.strict()` na schematach kolekcji `news` i `pages`.
3. Testy w `node --test` + weryfikacja mutacyjna na buildzie, nie tylko na testach.

### Wykonano (2026-08-28)

**Walidator ręczny, nie Zod — bo ma być testowalny bez bundlera.** Zod jest w repo B dostępny wyłącznie przez `astro:content`, którego `node --test` nie rozwiąże. Ręczny walidator to ten sam wzorzec, który po podejściu 11 rządzi modułami `config/`: czysta logika osobno od odczytu JSON, więc daje się uruchomić bez Astro. Trzy moduły:

| Moduł | Rola |
|---|---|
| `config/layout-components.ts` | lustro `lib/astro-layout/components.ts` — komponent → strefy, w których repo go renderuje |
| `config/layout-contract-slots.ts` | sloty, strefy, wpisy recent changes |
| `config/layout-contract.ts` | klucze korzenia, kategorie, `displays`, `assertLayoutPayload` |

`layout-payload.ts` woła `assertLayoutPayload(layoutFile)` na poziomie modułu, więc **niezgodność przerywa build**, a nie renderuje pustą strefę. Zakres naruszeń: nieznany `component`; komponent w strefie, której repo nie renderuje (baner w `home`); nieznana strefa; nieznany klucz w korzeniu (`slots` i `weather` tolerowane jako legacy P2-6); duplikat `id` slotu; slot bez `id`/`label`; slug kategorii poza `[a-z0-9-]` lub bez separatorów (P0-3 z drugiej strony); wpis „Ostatnie zmiany” bez `title`/`href`/`changedAt` albo z nieznanym `kind`.

**Front-matter `.strict()` w obu kolekcjach.** Przed zmianą policzone zostały wszystkie klucze w treści (49 plików): 11 pól, wszystkie w schemacie — `.strict()` nie wywala istniejącego contentu. Lustro po stronie panelu (`news-frontmatter-schema.ts`) było `.strict()` od podejścia 6; teraz obie strony reagują tak samo, tylko w różnym momencie: OmniPress w testach, strona na buildzie.

**Dlaczego czerwony build jest tu właściwą reakcją.** Nieudany build Vercela nie zdejmuje strony — poprzednie wdrożenie zostaje na produkcji. Cena pomyłki to zatrzymana publikacja z jawnym komunikatem, zamiast strony z pustą sekcją i bez śladu w logach. Dokładnie ten scenariusz opisuje P0-4: slot `home.pinned` istniał po obu stronach i przez miesiące renderował się pusto.

**Weryfikacja mutacyjna — na buildzie, nie na teście.** Sonda z komponentem `sidebar.newsletter` w sidebarze i banerem w strefie `home` przerwała `npm run build` obydwoma komunikatami naraz. Sonda `tags: ["probe"]` w jednym wpisie przerwała build na `Unrecognized key: "tags"`. Obie sondy wycofane (`git checkout`), stan repo bez zmian.

**Rozmiar:** pierwsza wersja walidatora miała 210 linii i wywaliła `lint-file-size` — stąd podział na `layout-contract.ts` + `layout-contract-slots.ts` + `layout-components.ts` zamiast wpisu na liście wyjątków.

**Wynik weryfikacji:** repo B — `npm run lint` OK (75 plików) · `npm run check` 0 errors · `npm test` 79/79 (+19) · `npm run build` OK. Repo A — `npm run lint` OK · `npm test` 652/652 (+22 RLS opt-in) · `npm run build` OK.

---

## Podejście 15 — menu bez 404 + IA

**Cel:** P0-8 i P1-17. Jedna publikacja layoutu.

**Kroki**

1. Repo B: `git pull`.
2. W drzewie `header.navigation` usunąć `/gmina/gops`, `/gmina/biblioteka`, `/gmina/druki`.
3. Usunąć grupę „Pliki do pobrania” (zostaje pusta po zdjęciu Druków).
4. Spłaszczyć „RODO” do liścia „Klauzula informacyjna” → `/gmina/klauzula-rodo`.
5. Dodać poziom 1: Aktualności → `/aktualnosci`, Ochrona ludności → `/ochrona-ludnosci`.
6. Kolejność: Aktualności, Gmina, Gospodarka odpadami, Ochrona ludności, Kontakt, BIP.
7. Zapisać szkic i opublikować layout na origin (panel albo sync). Upewnić się, że `sites.astro_layout` = plik w B — inaczej kolejny reconcile cofnie zmianę.

**Weryfikacja:** w `src/config/omnipress-layout.json` na `origin/main` nie ma trzech martwych `href`; są dwa nowe. `npm test` w A jeśli ruszany był parser.

**Commit:** publikacja layoutu (commit w B przez GitHub API) + ewentualnie commit w A tylko gdy ruszany kod.

### Wykonano (2026-09-03)

- `reshapeTopNav` w repo A (`src/lib/astro-layout/reshape-top-nav.ts`) — zdejmuje trzy martwe `href`, usuwa pustą grupę „Pliki do pobrania”, spłaszcza zagnieżdżone grupy z jednym dzieckiem (RODO → Klauzula informacyjna), dokłada `/aktualnosci` i `/ochrona-ludnosci`, ustawia kolejność poziomu 1. 7 testów, w tym idempotencja.
- Publikacja: commit `a69a7f8` na `origin/main` repo B (plik `src/config/omnipress-layout.json`).
- `sites.astro_layout` jednostki `gmina-miedzna-pl` zsynchronizowany z plikiem (nawigacja + `publishedLayoutHash` / blob `ce9906a`).
- Poziom 1: Aktualności, Gmina, Gospodarka odpadami, Ochrona ludności, Kontakt, BIP. Jednostki: szkoła + przedszkole (GOPS i Biblioteka wrócą w podejściu 18).

**Wynik weryfikacji:** origin blob = `ce9906a` · w pliku brak `/gmina/gops`, `/gmina/biblioteka`, `/gmina/druki` · są `/aktualnosci` i `/ochrona-ludnosci` · repo A `npm test` 761/761 · repo B `npm test` 95/95 (kontrakt layoutu OK).

## Podejście 16 — walidacja menu bez self-check

**Cel:** P0-9. `dead_link` znowu znaczy 404.

**Kroki**

1. W `publish.ts`, `publish-all.ts`, `layout-editor-context.ts` nie przekazywać `collectNavInternalPageOptions(navigation)` jako `extraPaths` do `buildKnownNavPaths`. Zostawić `DEFAULT_STATIC_ROUTES` + opublikowane strony + slugi kategorii.
2. `collectNavInternalPageOptions` zostaje w `mergePageOptionsForNavEditor` (select w edytorze).
3. Test w `validate-nav.test.ts` (albo kontekst publikacji): menu z `/gmina/gops` przy known `/gmina/wojt` + kategorie `aktualnosci` itd. → jeden `dead_link`. `/aktualnosci/cokolwiek` nadal OK (prefiks kategorii).
4. `npm test`, `npm run build` w A.

**Weryfikacja:** publikacja layoutu z martwym href kończy się `dead_nav_links`, nie commitem.

**Commit:** repo A.

### Wykonano (2026-09-03)

- `buildKnownNavPaths` nie przyjmuje `extraPaths` — known paths to wyłącznie `DEFAULT_STATIC_ROUTES` + opublikowane `site_pages` + slugi kategorii. Parametr był jedyną furtką self-checku.
- `collectNavInternalPageOptions` zostaje w `NavigationTreeSection` / `mergePageOptionsForNavEditor` (select edytora).
- Testy: `validate-nav.test.ts` (P0-9), `nav-known-paths.test.ts` (skład known + regresja callerów).

**Wynik weryfikacji:** repo A — `npm test` 766/766 (+22 RLS opt-in) · `npm run build` OK.

## Podejście 17 — a11y i hamburger

**Cel:** P1-18. Bez zmiany kontraktu JSON.

**Kroki**

1. Repo B: `git pull`.
2. `Layout.astro` — skip-link „Przejdź do treści” przed topbarem, cel na `main`.
3. `Navigation.astro` — rodzice z dziećmi bez `href="#"` (pominięty href albo przycisk); BIP: `rel="noopener noreferrer"` + zapowiedź nowej karty (wzorzec: `SidebarBanner.astro`).
4. `nav-menu-client.ts` — Escape i klik poza zamykają też hamburger (`.nav-list.active`, `aria-expanded` na `.menu-toggle`).
5. Teksty UI strony B — jeśli nowy napis, zgodnie z konwencją repo B (tu hardkod PL jest normą strony, nie panelu).
6. `npm test`, `npm run build` w B.

**Commit:** repo B.

### Wykonano (2026-09-03)

- `Layout.astro` — skip-link „Przejdź do treści” przed topbarem, cel `#main-content` na `<main>`.
- `Navigation.astro` + `NavDropdown.astro` — rodzice z dziećmi jako `<button type="button">` zamiast `href="#"`; linki zewnętrzne (BIP) z `target="_blank"`, `rel="noopener noreferrer"` i `<span class="sr-only"> (otwiera się w nowej karcie)</span>`.
- `nav-menu-client.ts` — Escape i klik poza menu zamykają też hamburger (`.nav-list.active`, `aria-expanded` na `.menu-toggle`).
- `global.css` — klasy `.skip-link` i `.sr-only`; `layers.css` — token `--z-skip-link`.
- `nav-link.ts` + test jednostkowy `isExternalNavHref`.

**Wynik weryfikacji:** repo B — commit `5c5ddce` · `npm test` 97/97 · `npm run lint` OK · `npm run build` OK.

**Poza zakresem (osobne sesje):** pułapka fokusu wyszukiwarki. `aria-current` — podejście 19.

## Podejście 18 — treść GOPS / Biblioteka / Druki

**Cel:** przywrócić trzy strony z WordPressa, potem wrócić do menu (P0-8).

**Kroki**

1. Repo B: `git pull`.
2. Pobrać treść z WP (REST API): GOPS (kontakt + druki), Biblioteka, Wnioski i druki (ogólne, USC, referat).
3. Utworzyć `src/content/pages/gmina/{gops,biblioteka,druki}/` z PDF obok markdown.
4. Przywrócić `/gmina/gops`, `/gmina/biblioteka`, `/gmina/druki` w `omnipress-layout.json`.
5. Repo A: usunąć `DEAD_TOP_NAV_HREFS` z `reshapeTopNav` (strony już istnieją).
6. `npm test`, `npm run build` w obu repo.

**Commit:** repo B (strony + menu), repo A (skrypt migracji + reshape + testy).

### Wykonano (2026-09-03)

- Skrypt `scripts/migrate-wp-gops-pages.mjs` — pobiera treść i 22 PDF z WP.
- Repo B: trzy strony z pełną treścią (bez placeholderów); menu w `omnipress-layout.json`.
- Repo A: `reshapeTopNav` bez filtrowania martwych href; testy P0-9 na generycznym `/gmina/brak-strony`.

**Wynik weryfikacji:** repo B — 97/97 testów, build OK (29 stron, `/gmina/gops`, `/gmina/biblioteka`, `/gmina/druki` w output). Repo A — reshape + nav tests OK.

## Podejście 19 — aria-current w menu

**Cel:** czytnik ekranu i wzrokowe oznaczenie bieżącej strony w menu górnym. Bez zmiany kontraktu JSON.

**Kroki**

1. Repo B: `git pull`.
2. `nav-current.ts` — normalizacja ścieżki, najdłuższy pasujący href (`/` tylko dokładny).
3. `Navigation.astro` + `NavDropdown.astro` — `aria-current="page"` na trafionym linku; klasa `is-current-section` na rodzicu.
4. `navigation.css` — podkreślenie bieżącej pozycji (nie tylko kolor).
5. `npm test`, `npm run lint`, `npm run build` w B.

**Commit:** repo B.

### Wykonano (2026-09-03)

- `normalizeNavPath` / `matchCurrentNavHref` — dokładne + prefiks (stronicowanie, wpis kategorii); `/` nie oznacza całego menu.
- Menu: `aria-current="page"` na linku, `is-current-section` na gałęzi (np. Gmina przy `/gmina/gops`).
- Styl: dolny pasek na poziomie 1, lewy pasek w dropdownie.

**Wynik weryfikacji:** repo B — `npm test` 104/104 · `npm run lint` OK · `npm run build` OK. HTML: `/` bez znacznika; `/aktualnosci/strona/2` → Aktualności; `/gmina/gops` → GOPS + sekcja Gmina; `/ochrona-ludnosci/plecak-ewakuacyjny` → Ochrona ludności.

## Podejście 20 — pułapka fokusu wyszukiwarki

**Cel:** Tab nie wychodzi z otwartej wyszukiwarki; zamknięcie wraca fokus na lupę. Bez zmiany kontraktu JSON.

**Kroki**

1. Repo B: `git pull`.
2. `focus-trap.ts` — `resolveTabWrap` (ostatni Tab → pierwszy, pierwszy Shift+Tab → ostatni).
3. `SearchModal.astro` — `role="dialog"`, `aria-modal`, `inert` + `visibility: hidden` gdy zamknięta; przycisk zamknięcia z etykietą.
4. `search-modal-client.ts` — otwarcie fokusuje pole, Escape zamyka bez hamburgera, fokus wraca na lupę; wyniki escapowane (XSS).
5. `npm test`, `npm run lint`, `npm run build` w B.

**Commit:** repo B (+ docs w A).

### Wykonano (2026-09-04)

- `resolveTabWrap` + 6 testów; dopasowanie wyników i escape HTML w `search-match.ts` (6 testów).
- Modal: dialog + `inert` / `aria-hidden` / `visibility: hidden` poza otwarciem; `aria-live` na liście.
- Klient: pułapka Tab, przywracanie fokusu, blokada scrolla `body`; Escape nie zamyka hamburgera (`isSearchModalOpen` w `nav-menu-client`).
- Lupa: `aria-haspopup="dialog"` + `aria-controls="search-modal"`.

**Wynik weryfikacji:** repo B — `npm test` 116/116 · `npm run lint` OK · `npm run check` 0 errors · `npm run build` OK. HTML (home, GOPS, Aktualności, Ochrona ludności): `role="dialog"` + `aria-modal` + `inert` + lupa `aria-haspopup="dialog"`.

## Podejście 21 — stopka: martwe linki + walidacja

**Cel:** dwa 404 w stopce (ta sama klasa co P0-8 w menu) i luka walidacji — publikacja layoutu nie sprawdzała `legalLinks` / `contactCtaHref`.

**Kroki**

1. Repo B: `git pull`.
2. `omnipress-layout.json` — `/deklaracja-dostepnosci` → `/gmina/deklaracja-dostepnosci`, `/polityka-prywatnosci` → `/gmina/klauzula-rodo` (etykieta: Klauzula informacyjna, jak w menu).
3. `astro.config.mjs` — przekierowania 301 ze starych adresów.
4. Repo A: `validateFooterLinks` + `validateLayoutPublicLinks` w publikacji i w edytorze (te same known paths co menu, bez self-checku).
5. Defaulty `migrate-layout.ts` i fallback w `Footer.astro` — te same ścieżki.
6. a11y: `tel:` przy numerach, `aria-current` na linkach prawnych, `rel` + zapowiedź nowej karty jak w menu; CSS wyniesiony do `footer.css` (koniec wyjątku P2-3 na `Footer.astro`).

**Weryfikacja:** `npm test` w A i B; publikacja layoutu z `/polityka-prywatnosci` kończy się `dead_nav_links`.

**Commit:** repo B (layout + stopka + 301) + repo A (walidacja + defaulty + docs).

### Wykonano (2026-09-04)

- Layout: poprawione `legalLinks` w `footer.main`; 301 `/deklaracja-dostepnosci` i `/polityka-prywatnosci`.
- OmniPress: `validate-footer.ts` / `validate-layout-links.ts` — `publish.ts`, `publish-all.ts`, `layout-editor-context.ts`.
- Defaulty seedu i fallback strony wskazują `/gmina/deklaracja-dostepnosci` i `/gmina/klauzula-rodo`.
- Stopka: `phoneToTelHref`, `aria-current`, etykieta CTA ze slota, `nav` „Linki prawne”; `Footer.astro` 150 linii.

**Wynik weryfikacji:** repo A — `npm test` 771/771 (+22 RLS opt-in) · `npm run lint` OK · `npm run build` OK. Repo B — `npm test` 120/120 · `npm run lint` OK · `npm run check` 0 errors · `npm run build` OK. HTML: home — `tel:+48256918327`, legal `/gmina/deklaracja-dostepnosci` + `/gmina/klauzula-rodo`; `/gmina/deklaracja-dostepnosci` — `aria-current="page"` na deklaracji.

---

## Powiązane dokumenty

- [AUDYT.md](./AUDYT.md) — rejestr znalezisk i uzasadnienia
- [KONWENCJE.md](./KONWENCJE.md) — konwencje kodu
- [STATUS.md](./STATUS.md) — stan implementacji
- [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc) — kontrakt między repozytoriami
