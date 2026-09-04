# Audyt spójności OmniPress ↔ repo Astro

**SSOT:** plan audytu i rejestr znalezisk. Stan na 2026-08-27, wersja OmniPress `0.10.0`.

Projekt opiera się o **dwa repozytoria**: OmniPress (panel, zapisuje) i `mbatorowicz/gmina-miedzna.pl` (strona Astro, czyta). Kontrakt między nimi: [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc).

Audyt podzielony na **porcje** — każda samodzielna, z własnym kryterium wyjścia. Kolejność wynika z nieodwracalności skutków, nie z wygody.

Ten dokument odpowiada na pytanie **co i dlaczego**. Konkretne kroki naprawcze, rozpisane na wykonalne podejścia: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md).

---

## Stan wyjściowy

| Obszar | OmniPress | repo Astro |
|--------|-----------|------------|
| CI | ✅ `.github/workflows/ci.yml` (lint + test + build) | ❌ brak, `.github` puste |
| Lint | ✅ ESLint + `lint-ui-classes.mjs` — czysty (209 plików) | ❌ brak |
| Type check | ⚠️ `astro/tsconfigs/strict`, ale bez `tsc --noEmit` w pipeline (P1-15 — zamknięte w podejściu 13) | ⚠️ strict + `@astrojs/check` w zależnościach, nieużywany |
| Testy | ✅ 72 pliki / 354 testy, zielone | ⚠️ 4 pliki z ręcznej listy w `package.json` |
| E2E | ✅ Playwright, 5 spec | ❌ brak |

Wniosek: cała siatka bezpieczeństwa jest po jednej stronie kontraktu. Repo Astro przyjmuje zapisy z panelu bez żadnej weryfikacji.

---

## Rejestr znalezisk

Priorytety: **P0** — dotyka produkcji lub jest nieodwracalne; **P1** — ryzyko systemowe; **P2** — dryf dokumentacji.

### P0-1 — `ł` gubione w slugach

`normalize('NFD').replace(/\p{Diacritic}/gu, '')` nie obsługuje `ł` (U+0142): to samodzielny znak, nie litera z diakrytykiem, więc nie ma dekompozycji i wypada dopiero na `[^a-z0-9]`, zamieniając się w myślnik.

- `src/lib/posts/access.ts` → `slugFromTitle`
- `src/lib/admin/slug.ts` → `normalizeSlug`

Skutek na produkcji (publiczne URL-e w repo Astro):

| Tytuł | Wygenerowany slug | Oczekiwany |
|-------|-------------------|------------|
| Ogłoszenie o przetargu | `og-oszenie-o-przetargu` | `ogloszenie-o-przetargu` |
| Ogłoszenie o przekazaniu Planu Ogólnego… | `og-oszenie-o-przekazaniu-planu-ogolnego…` | `ogloszenie-…` |
| Zapraszamy do współtworzenia… | `zapraszamy-do-wspo-tworzenia…` | `…wspoltworzenia…` |
| …poprawy dostępu do małej infrastruktury | `…dostepu-do-ma-ej-infrastruktury-p` | `…do-malej-…` |

Dotkniętych jest **7 z 23** opublikowanych wpisów. Migracja `20250621000000_fix_kgw_post_slug.sql` to ślad po ręcznym łataniu tego samego problemu.

### P0-2 — dwie funkcje slugujące, brak SSOT

`slugFromTitle` (`lib/posts/access.ts`) i `normalizeSlug` (`lib/admin/slug.ts`) mają różne regexy i różny zakres (`[^a-z0-9]` vs `[^a-z0-9-]`, kolaps myślników tylko w jednej). Żadna nie jest wskazana jako obowiązująca.

### P0-3 — slugi kategorii bez normalizacji

Pole `category_slug` to surowy input (`src/lib/admin/categories-form-client.ts:141`), bez wywołania `normalizeSlug`. W produkcyjnym `src/config/omnipress-layout.json` znajdują się w efekcie:

```
planogólnygminymiedzna
zarządzenia
```

To **2 z 4** kategorii, a slug kategorii jest segmentem ścieżki każdego należącego do niej wpisu (`src/pages/[category]/`) — w praktyce psuje adresy **6 z 23** wpisów. `planogólnygminymiedzna` ma podwójny defekt: znak spoza ASCII **i** brak separatorów, bo powstał z ręcznie wpisanej nazwy. Szkoda jest większa niż przy slugach wpisów (P0-1), mimo że dotyczy dwóch rekordów.

### P0-4 — sekcja „Przypięte" na produkcji nie działa

Repo Astro filtruje slot `home.pinned` po polu `pinned` we front-matterze (`src/pages/index.astro:27-28`), a OmniPress **nigdy tego pola nie zapisuje** — nie ma go w `lib/publish/frontmatter.ts`, ani w bazie, ani w UI. Slot jest skonfigurowany w produkcyjnym layoucie z `hideWhenEmpty: true`, więc sekcja po prostu nigdy się nie pokazuje. Funkcja istnieje po obu stronach, ale nie ma między nimi połączenia — i nic tego nie sygnalizuje.

### P0-5 — `terytGmina` martwe po stronie zapisu

Typ istnieje w `src/lib/astro-layout/types.ts:62`, ale pole nie występuje ani w `parse.ts`, ani w `parse-form.ts` — OmniPress go nie zapisze. Repo Astro jest na nie gotowe (`src/lib/imgw/weather-config.ts:50-53`) i po cichu wchodzi w `undefined`, czyli ostrzeżenia pogodowe działają bez filtra gminy.

### P0-6 — trzy martwe linki w menu produkcyjnym — ✅ zamknięte (2026-08)

Menu w `omnipress-layout.json` zawierało pozycje `/informacje/…` do nieistniejącej kategorii. Usunięte przy migracji slugów (podejście 4). **Następca:** [P0-8](#p0-8--trzy-martwe-linki-w-menu-astro-gops-biblioteka-druki----zamknięte-2026-09-03).

[STATUS.md](./STATUS.md) oznacza „Walidacja linków menu przed sync GitHub" jako ✅ — to było mylące; przyczyna systemowa jest w [P0-9](#p0-9--walidacja-menu-sprawdza-menu-wobec-samego-menu).

### P0-8 — trzy martwe linki w menu Astro (GOPS, Biblioteka, Druki) — ✅ zamknięte (2026-09-03)

| Menu | Adres | Stan |
|------|--------|------|
| Gmina → Jednostki → GOPS | `/gmina/gops` | strona opublikowana (podejście 18) |
| Gmina → Jednostki → Biblioteka | `/gmina/biblioteka` | strona opublikowana (podejście 18) |
| Gmina → Wnioski i druki | `/gmina/druki` | strona opublikowana (podejście 18) |

Tymczasowo zdjęte w podejściu 15 (brak treści w repo). Przywrócone po migracji z WordPressa w podejściu 18. Plan: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md#podejście-18--treść-gops--biblioteka--druki).

### P0-9 — walidacja menu sprawdza menu wobec samego menu — ✅ zamknięte (2026-09-03)

`publish.ts`, `publish-all.ts` i `layout-editor-context.ts` dokładały do `buildKnownNavPaths(..., extraPaths)` wynik `collectNavInternalPageOptions(navigation)` — czyli **wszystkie href z drzewa menu**. `validateNavigationLinks` porównywał menu z kopią menu: `dead_link` nie zapalał się dla pozycji już zapisanej w drzewie. `mergePageOptionsForNavEditor` słusznie używa tego zbioru w selectcie edytora; ten sam zbiór nie może iść do walidatora.

Dlatego P0-6 i P0-8 przeszły publikację mimo ✅ w STATUS.

**Zamknięte w podejściu 16:** `buildKnownNavPaths` nie przyjmuje już `extraPaths`. Known paths = trasy statyczne + opublikowane strony + slugi kategorii. `collectNavInternalPageOptions` zostaje tylko w edytorze.

### P1-17 — Aktualności i Ochrona ludności poza menu górnym — ✅ zamknięte (2026-09-03)

Kategorie `/aktualnosci` (najwięcej wpisów, kafelek „Więcej” na home) i `/ochrona-ludnosci` (commit `52a4167`, banner w sidebarze) nie były w `header.navigation`. Mieszkaniec bez sidebara ich nie znajdzie.

**Zamknięte w podejściu 15:** poziom 1 to Aktualności, Gmina, Gospodarka odpadami, Ochrona ludności, Kontakt, BIP.

### P1-18 — menu górne: klawiatura i telefon — ✅ zamknięte (2026-09-03, podejście 17)

Zamknięte: skip-link, rodzice z dziećmi bez `href="#"`, Escape/klik poza zamykają hamburger, BIP z `rel` i zapowiedzią nowej karty.

**Poza zakresem:** DNS cutover — ostatni krok projektu, nie najbliższa sesja. Domena produkcyjna zostaje na starym hostingu do odwołania.

### P1-1 — lokalne repo Astro rozjeżdża się z origin

W momencie audytu lokalne `main` było **14 commitów** za `origin/main`. OmniPress publikuje przez GitHub API prosto do origin, więc lokalna kopia nigdy się nie dogania sama. Każda praca w tym repo startuje z nieaktualnego stanu — to problem systemowy, nie jednorazowy.

Podejście 1 zsynchronizowało repo i zapisało regułę w [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc): źródłem prawdy o stanie strony jest `origin/main`, każda praca w repo B zaczyna się od `git pull`.

### P1-2 — repo Astro bez CI i bez wymuszonej jakości

Brak workflow, brak ESLint, `astro check` nieuruchamiany mimo obecnej zależności. `npm test` to ręcznie wpisana lista czterech plików — nowy test nie uruchomi się, dopóki ktoś nie dopisze go do `package.json`.

### P1-3 — assety wpisów rosną w historii gita bez ograniczeń — ✅ rozstrzygnięte

Repo Astro: 66 MB (28 MB spakowane), w tym dwa PDF-y po ~31 MB. Każda wersja załącznika zostaje w historii na zawsze; przyrost jest liniowy względem liczby publikacji.

**Decyzja w podejściu 12: assety zostają w gicie.** Dwa założenia tego wpisu okazały się nietrafione. Przyrost **nie jest** liniowy względem liczby publikacji — mediana wpisu to 1,4 MB, a 63% wagi to dwa pliki z jednego wpisu; miesiąc z 8 publikacjami dał 4,7 MB, miesiąc z 73 dał 84 MB, bo trafił się w nim plan ogólny. Limit „100 MB" Vercela **nie jest** sumą źródeł, tylko rozmiarem pojedynczego pliku (zweryfikowane deployami: 101,5 MB źródeł przechodzi, jeden plik 105 MB nie), a panel i tak przyjmuje maksymalnie 50 MB na załącznik.

Przy okazji szukania „momentu przekroczenia limitu" znalazł się koszt płacony codziennie — patrz **P1-16**. Żeby decyzja nie odziedziczyła się w nieskończoność, `scripts/lint-content-weight.mjs` w repo B przerywa build przy 300 MB załączników z odesłaniem do przeliczenia wariantów. Pełne uzasadnienie i liczby: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md#decyzja-2026-08-27-assety-zostają-w-gicie).

### P1-16 — wpis pobierał 70 MB PDF-ów przy wejściu na stronę — ✅ naprawione

Znalezione w podejściu 12. Wpis o planie ogólnym osadza pięć viewerów PDF o łącznej wadze 69,98 MB i wszystkie startowały przy wejściu na stronę, w całości.

Złożyły się na to dwie rzeczy. `pdfDocumentOptions` w `lib/pdf-viewer/mount.ts` wyłączało czytanie zakresami dla **każdej** ścieżki same-origin, choć powodem wyjątku był tylko endpoint panelu `/api/posts/{id}/assets/{assetId}/file` (odpowiada całym body bez `Accept-Ranges`). Statyczne załączniki strony mają adres `/post-files/<slug>/<plik>.pdf`, więc też się łapały — mimo że produkcja podaje na nich `Accept-Ranges: bytes`. Do tego `mountPdfViewers` montowało wszystkie widgety naraz, bez oglądania się na widok.

W planie hobby (100 GB transferu) ~1430 odsłon tego jednego wpisu wyczerpywało miesięczny limit. Naprawa zawęża wyjątek do endpointu panelu i montuje viewery leniwie (`IntersectionObserver`, `rootMargin` 300 px).

### P1-4 — śmieci i luki w `.gitignore` repo Astro — ✅ zamknięte

Śledzone w gicie: `dump.txt`, `error.log`, `out.txt`, `zips.txt`, `Importuj_Paczki.bat`, `archived_packages/*.zip` (9 plików). `.gitignore` ignoruje tylko `.env` i `.env.production` — `.env.local` **nie jest** ignorowany (OmniPress ignoruje `.env*`).

Zamknięte w podejściu 1. `Importuj_Paczki.bat` nie był śmieciem, tylko wejściem do martwego już flow importu paczek — usunięty razem ze `scripts/import-packages.mjs` i dokumentacją, którą opisywał. Szczegóły: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md#podejście-1--punkt-startu-i-higiena).

### P1-5 — rozjazd wersji i metadanych

| | OmniPress | repo Astro |
|---|---|---|
| `name` | `omnipress` | ~~`extra-earth`~~ → `gmina-miedzna` (podejście 1) |
| `version` | `0.10.0` | `0.0.4` |
| `astro` | `^6.4.3` | `^6.1.4` |

Zostaje rozjazd wersji Astro i strategii wersjonowania.

### P1-6 — schemat treści nie wykrywa dryfu — ✅ zamknięte

`src/content.config.ts` w repo Astro używał Zod **bez `.strict()`** — pola zapisane przez OmniPress, których schemat nie zna, były po cichu ignorowane zamiast zgłaszać błąd. Dryf kontraktu był niewidoczny do chwili, gdy coś przestawało działać na stronie. Odwrotnie: kolekcja `pages` wymaga `slug` bez transformacji, więc brak tego pola wywali build.

**Zamknięte w podejściu 14.** Obie kolekcje (`news`, `pages`) są `.strict()`, więc nieznane pole przerywa build zamiast zniknąć. Weryfikacja mutacyjna: `tags: ["probe"]` w jednym wpisie wywala build komunikatem `Unrecognized key: "tags"`. Test kontraktowy w OmniPress (`frontmatter-contract.test.ts`) łapie ten sam dryf wcześniej — przed publikacją.

### P1-7 — niespójne komunikaty commitów w repo Astro

Mieszanka `OmniPress: <tytuł wpisu>` i conventional commits. Dwa commity (`212bc83`, `6eab951`) mają jako message goły SHA — prawdopodobnie błąd generatora komunikatu.

### P1-8 — dokumentacja layoutu opisuje nieaktualny klucz

Reguła [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc) i `docs/OMNIPRESS.md` w repo Astro deklarują `{ categories, displays, slots }`. OmniPress zapisuje **`zones`** (`buildLayoutFilePayload`, `parse.ts:310-320`), a produkcyjny plik ma `categories`, `displays`, `zones`.

Skutek jest łagodniejszy, niż wyglądał na pierwszy rzut oka: parser repo Astro akceptuje **oba** klucze (`load-config.ts:221-227` — `slots?` jako fallback legacy), więc rozjazd nie wywali builda. Pozostaje jednak realne ryzyko: dokumentacja kieruje na martwą ścieżkę, a plik zapisany częściowo w jednej, częściowo w drugiej konwencji da niespójny render bez żadnego błędu.

### P1-9 — repo Astro nie waliduje ID komponentów — ✅ zamknięte

JSON layoutu był importowany statycznie, bez Zod i bez whitelisty (`load-config.ts:1`). Nieznany `component` nie renderował się po cichu albo renderował się źle — build przechodził. OmniPress waliduje przy imporcie (`parse.ts:230`, `isLayoutComponentId`), więc ochrona była tylko po jednej stronie. Powiązany przypadek: `sidebar.banner` był dozwolony w strefie `home` (`components.ts:115-120`), ale repo Astro renderuje całą strefę `home` jako feed wpisów — konfiguracja poprawna według A, błędna wizualnie w B (zablokowane już w podejściu 5).

**Zamknięte w podejściu 14.** `src/config/layout-contract.ts` waliduje plik przed pierwszym odczytem i przerywa build listą naruszeń: nieznany komponent, komponent w strefie, której repo nie renderuje, nieznana strefa lub klucz w korzeniu, duplikat `id`, slug kategorii poza `[a-z0-9-]`, wpis recent changes bez wymaganych pól. Lista komponentów (`layout-components.ts`) jest lustrem SSOT z OmniPressa — asymetria z tabeli „Stan wyjściowy” przestaje obowiązywać: obie strony kontraktu sprawdzają teraz to samo. Zamiast Zoda ręczny walidator, żeby moduł dał się uruchomić w `node --test` bez bundlera (19 przypadków, w tym walidacja produkcyjnego pliku).

### P1-10 — reguła warstw jest łamana systemowo — ✅ zamknięte

[KONWENCJE.md](./KONWENCJE.md) mówiła, że `components/admin/` i `components/posts/` importują tylko `ui/` i `shell/`. Realnie **około 60 plików** importowało bezpośrednio z `@/lib/` (m.in. `LayoutSlotChromePanel.astro:3-4`, `PostGalleryPanel.astro:3`, `AdminPostsTable.astro:234`). Reguła łamana sześćdziesiąt razy nie jest regułą.

**Rozstrzygnięcie (podejście 11):** reguła przeformułowana na „komponent nie sięga po dane" — typy, czyste helpery i skrypty klienta wolno, moduł operujący na kliencie Supabase nie. Wymusza ją `scripts/lint-layers.mjs`, który wylicza zbiór modułów danych z grafu importów zamiast z listy do utrzymania. Konsekwencja przy pisaniu `lib/`: moduł nie miesza czystej logiki z zapytaniami — stąd wzorzec `foo-model.ts` obok `foo.ts`. Szczegóły: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md) §Podejście 11.

### P1-15 — repo nie sprawdza typów — ✅ zamknięte

`npm run lint` uruchamiał ESLint bez reguł typowanych, a `astro build` kompiluje esbuildem, który typów nie weryfikuje. **W pipeline nie było kroku `tsc --noEmit`** — na dzień audytu dawał on **148 błędów w 52 plikach**.

To nie jest hałas lintera. Trzy defekty naprawione w podejściu 11 były błędami typów, które nikt nie sprawdzał:

- `componentToKind()` w `layout-slots-sections.ts` wołało `getComponentKind` bez importu — `ReferenceError` przy każdym otwarciu panelu slotu w przeglądarce;
- `SectionFieldLabels` nie miało pola `weatherTerytGmina`, więc etykieta w panelu pogody renderowała się jako `undefined`;
- `buildSlotCardHtml` dostawało obiekt bez `formId`, więc checkbox „Wł." na karcie dodanej po stronie klienta nie trafiał do wysyłanego formularza.

Wszystkie trzy `tsc` pokazuje jednym przebiegiem.

**Zamknięte w podejściu 13.** `npm run typecheck` (`tsc --noEmit`) jest pierwszym krokiem `npm run lint`, repo schodzi na zero błędów bez baseline. Przy okazji wyszła przyczyna, dla której część tych defektów była w ogóle możliwa: **`App.Locals` nigdy nie był typowany**. Deklaracja leżała w `src/middleware.d.ts`, obok `src/middleware.ts` — TypeScript traktuje taki plik jako deklarację wyjściową modułu i pomija go w programie, więc `locals.user`, `locals.profile`, `locals.supabase` i `locals.cspNonce` były nietypowane w całym middleware, guardach i trasach API. Deklaracja mieszka teraz w `src/app.d.ts` w `declare global`.

Typecheck znalazł trzy kolejne realne defekty produkcyjne: `adminSites.astroHelp` (klucz należy do `adminUnit` — `TypeError` przy teście kanału GitHub z classic PAT), utratę `zones` przy publikacji ogłoszeń i przy porównaniu szkicu ze stroną live (komponenty przestawione do stopki wracały do sidebara, panel bez powodu raportował „Strona zmieniona poza OmniPress"), oraz typ węższy niż i18n w `layout-editor-status.ts`. Szczegóły: [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md) §Podejście 13.

### P0-7 — migracja blokady eskalacji nigdy nie trafiła na produkcję — ✅ zamknięte

Wykryte przez testy integracyjne RLS z podejścia 10. Migracja `20250613000000_profiles_self_update_guard.sql` (`npm run setup:profiles-guard`) figurowała w [STATUS.md](./STATUS.md) jako zastosowana (✅ „RLS trigger `profiles`"), ale w bazie produkcyjnej **nie istniała** ani funkcja `guard_profiles_self_update`, ani trigger `profiles_guard_self_update`.

Skutek: polityka `profiles_update_own` pozwala redaktorowi na `update` własnego wiersza (`using id = auth.uid()`, `with check id = auth.uid()`) i **nie ogranicza kolumn**. Trigger był jedyną blokadą zmiany `role`. Bez niego dowolny redaktor mógł jednym żądaniem REST z własnym tokenem ustawić sobie `role = 'admin'` i przejąć panel administracyjny.

Test odtwarzający: `rls.integration.test.ts` → „redaktor nie nada sobie roli administratora" (przed migracją: `ok: true`, po: wyjątek `forbidden_profile_field: role`).

Wniosek szerszy: tabela migracji w STATUS.md opisywała **intencję**, nie stan bazy. `lint-docs-setup.mjs` z podejścia 8 pilnuje zgodności `package.json` ↔ tabela, ale nikt nie porównywał tabeli z produkcją. Pozostałe 24 migracje zweryfikowano ręcznie — wszystkie obecne.

### P1-11 — moduły krytyczne bez testów — ✅ zamknięte

Około 90 modułów w `src/lib/**` nie ma pliku `*.test.ts` obok. Problem nie jest w liczbie, tylko w tym, **które** to moduły — dokładnie te, które [KONWENCJE.md](./KONWENCJE.md) oznacza jako „nie psuć bez lektury docs", i te, na których opiera się tabela bezpieczeństwa w [STATUS.md](./STATUS.md):

| Moduł | Rola |
|-------|------|
| `lib/supabase/cookies.ts` | Sesja SSR |
| `lib/auth/session.ts`, `guard-request.ts`, `routes.ts` | Pipeline auth |
| `lib/middleware/pipeline.ts` | Middleware SSR |
| `lib/security/nonce.ts` | CSP z nonce |
| `lib/publish/github-api.ts` (700 linii) | Zapis do GitHub |
| `lib/publish/worker.ts`, `queue.ts`, `dispatch.ts` | Worker publikacji |
| `lib/publish/github-astro.ts` | Główny flow publikacji |
| `lib/admin/require-admin.ts`, `posts.ts` | Guard admina, operacje masowe |
| `lib/astro-layout/store.ts`, `parse-form.ts` | Zapis layoutu |
| `lib/site-pages/access.ts`, `publish.ts` | Strony statyczne + RLS |

[STATUS.md](./STATUS.md) oznacza CSP, sesję i guardy jako ✅. To deklaracja bez pokrycia w testach.

**Zamknięte w podejściu 10** — moduły z tabeli mają testy (238 nowych przypadków), a każdy z nich zweryfikowano mutacyjnie: po celowym zepsuciu modułu jego test pada (24/24). Testy wykryły cztery realne defekty — P0-7 powyżej oraz trzy usterki kodu opisane w [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md) §Podejście 10. Poza zakresem zostały `github-astro.ts`, `admin/posts.ts`, `astro-layout/store.ts` i `site-pages/*` — te wchodzą w podejście 11 razem z refaktorem.

### P1-12 — `lint-ui-classes.mjs` ma dziury w zakresie

Skrypt raportuje 0 naruszeń na 209 plikach, ale:

- nie skanuje `src/components/shared/`, `src/layouts/`, `src/components/posts/` ani `src/lib/` poza `editor/` i `admin/`;
- sprawdza wyłącznie atrybut `class=` — pomija `setAttribute('class', …)` i klasy składane w template literals;
- **pomija całą linię, która zawiera `ui-`** (linie 62-63) — jedna długa linia z `ui-btn` i `text-red-500` przejdzie bez alarmu.

Zielony wynik lintu nie oznacza więc, że surowych kolorów nie ma.

### P1-13 — hardkodowane teksty poza i18n

Około **268** wystąpień polskich napisów poza `src/i18n/` (bez komentarzy i asercji testowych). Dobra wiadomość: trasy `src/pages/api/**` są czyste — używają `@/i18n` lub kodów błędów w redirectach. Zła: reszta nie.

Dominują dwa wzorce. Pierwszy to fallbacki `?? 'polski tekst'` w komponentach layoutu, mimo że właściwe klucze **już istnieją** w `admin-panels.ts` — czyli i18n jest podwojone, a wersja hardkodowana wygrywa przy braku klucza. Drugi to komunikaty operacyjne w `lib/publish/*` i `lib/admin/channel-test.ts`, które trafiają do UI przez JSON (`channel-test.ts:141,148,166`) albo przez `throw new Error(` (`frontmatter.ts:43`, `supabase/service.ts:9`).

Najbardziej rażące: `ChannelTestButton.astro:57,61` — `'Błąd testu'`, `'Błąd sieci — spróbuj ponownie.'` bezpośrednio w komponencie.

### P1-14 — czterokrotna duplikacja panelu załączników — ✅ zamknięte

`lib/editor/pdf-attachments.ts`, `docx-attachments.ts`, `file-attachments.ts` i `gallery-panel.ts` to były cztery niemal identyczne moduły po ~170 linii, realizujące ten sam wzorzec `readLabels → confirm → fetch DELETE → alert`.

Zamknięte w podejściu 11: `lib/editor/attachment-panel.ts` (wspólny cykl) + `file-attachment-panel.ts` (PDF, DOCX, pliki) + render galerii w `gallery-panel.ts`. Trzy pierwsze moduły usunięte.

### P2-1 — martwa dokumentacja WordPressa w repo Astro

`docs/OMNIPRESS.md` nadal opisuje „Kanał WordPress", a `.omnipress.json` zawiera `wordpress_site_url` — mimo że migracja `setup:remove-wordpress` usunęła ten typ z enuma, a [STATUS.md](./STATUS.md) deklaruje „Jedyny typ destynacji: `github_astro`".

### P2-2 — dryf `docs/` w OmniPress

| Dokument | Deklaruje | Stan faktyczny |
|----------|-----------|----------------|
| [STATUS.md](./STATUS.md) | „42 pliki" testów | 72 pliki / 354 testy |
| [STATUS.md](./STATUS.md) | tabela migracji | brak `20250621000000_fix_kgw_post_slug.sql` |
| [README.md](./README.md) | tabela npm | brak `setup:auth-rate-limits`, `setup:auth-mfa`, `setup:author-on-delete`, `setup:assets-*`, `setup:storage-import-admin`, `setup:posts-rejected-resubmit`, `verify:*`, `seed:nav-pages`, `lint`, `lint:ui`, `build:pdf-viewer` |

### P2-3 — pliki ponad limit konwencji — ✅ zamknięte (2026-09-04)

[KONWENCJE.md](./KONWENCJE.md) wymaga poniżej 150 linii i podziału powyżej 200. Realnie 28 plików przekraczało 200 linii.

| Repo | Plik | Linie | Po podejściu 11 |
|------|------|------:|----------------:|
| OmniPress | `src/lib/admin/navigation-form-client.ts` | 815 | 98 |
| OmniPress | `src/lib/publish/github-api.ts` | 700 | 39 (barrel) |
| OmniPress | `src/i18n/pl/admin-panels.ts` | 692 | 12 (barrel) |
| OmniPress | `src/lib/astro-layout/parse-form.ts` | 659 | 170 |
| OmniPress | `src/lib/admin/layout-slots-sections.ts` | 497 | — |
| Astro | `src/components/Navigation.astro` | 428 | 55 |
| Astro | `src/config/load-config.ts` | 423 | 21 (barrel) |
| Astro | `src/components/WeatherWidget.astro` | 385 | 47 |

Limit egzekwuje `scripts/lint-file-size.mjs` — w obu repo (podejście 11). **Dług `DŁUG P2-3` zamknięty (2026-09-04):** wszystkie pliki z prefiksem `DŁUG` podzielone; wyjątki to wyłącznie uzasadnione arkusze CSS i dwa SSOT (typy layoutu, lista ID komponentów, migracja zones, montaż PDF). W repo Astro zakres skryptu obejmuje też `.css`.

### P2-4 — pliki robocze w OmniPress — ✅ zamknięte

Pięć nieśledzonych skryptów: `scripts/tmp-probe-users.mjs`, `tmp-probe-create-user.mjs`, `tmp-e2e-create-user.mjs`, `tmp-e2e-create-user2.mjs`, `tmp-e2e-create-user3.mjs` — żaden nie jest w `.gitignore`, więc czekają, aż ktoś zrobi `git add .`. Do tego zmodyfikowany artefakt buildu `public/omnipress/pdf-viewer.js`. `.admin-password.txt` jest poprawnie ignorowany.

Zamknięte w podejściu 1: `scripts/tmp-*` trafiło do `.gitignore`. `pdf-viewer.js` **musi** zostać w gicie — czyta go runtime publikacji, a build jest deterministyczny, więc nie generuje diffu.

### P2-5 — martwe klucze i18n — ✅ zamknięte (2026-09-04)

Usunięte potwierdzone klucze bez odwołań: pozostałości zakładek layoutu (`layoutTabTopbar` / `Menu` / `Categories` + `*Lead`), nigdy niepodpięte (`savedDraft`, `adminSitePages.backToUnit`, `layout.breadcrumb.postReview`, `posts.upload.pdfTooLarge`, `auth.mfa.alreadyConfigured`) oraz ~40 dalszych unikalnych segmentów (martwe etykiety slotów, kody błędów których nic nie emituje, `admin.sites`, `ui.actions.saveDraft`). Duplikaty `invalidAction` / `remoteFailed` usunięte wcześniej w podejściu 9. Klucze o pospolitych nazwach (`title`, `lead`, `empty`) zostawione — destrukturyzacja mogłaby je ukryć.

### P2-6 — martwy kod odczytu w repo Astro

`load-config.ts` czyta dwa klucze root, których OmniPress nigdy nie zapisuje: `slots` (legacy przed `zones`) i `weather` (legacy przed konfiguracją w widgecie, `load-config.ts:350`). Podobnie `site.meta.url` — OmniPress je zapisuje, repo Astro nie używa go w SEO ani canonical. Legacy pliki `omnipress-navigation.json`, `omnipress-categories.json`, `omnipress-recent-changes.json` nie mają w repo Astro żadnej obsługi; OmniPress czyta je wyłącznie przy jednorazowym imporcie.

---

## Porcje audytu

### Porcja 0 — punkt odniesienia

Bez tego pozostałe porcje są zgadywaniem: sprawdzają nieaktualny stan repo Astro.

- Synchronizacja lokalnego repo Astro z `origin/main`.
- Ustalenie reguły: praca w repo Astro **zawsze** zaczyna się od `git pull`.
- Rozstrzygnięcie, co jest źródłem prawdy o stanie strony — git origin czy kopia lokalna.

**Kryterium wyjścia:** `git status -sb` w obu repo czysty i zsynchronizowany z origin.

### Porcja 1 — kontrakt danych OmniPress ↔ Astro

Mapowanie zostało już wykonane. Wynik jest lepszy, niż zakładałem: wszystkie 11 ID komponentów ma odpowiedniki po obu stronach, kształt `zones` jest zsynchronizowany, a strony statyczne mają pełną symetrię pól istotnych dla routingu. Zostaje do zrobienia:

- **P0-4** — dopiąć `pinned`: pole w bazie, przełącznik w UI, zapis we front-matterze. Bez tego slot `home.pinned` jest atrapą.
- **P0-5** — dopiąć `terytGmina` w `parse.ts` i `parse-form.ts` (round-trip JSON ↔ FormData + test w `parse.test.ts`, zgodnie z regułą symetrii).
- **P1-9** — ✅ walidacja ID komponentów po stronie repo Astro (podejście 14): `layout-contract.ts` przerywa build przy nieznanym komponencie lub złej strefie.
- **P2-6** — usunąć martwy odczyt (`slots`, `weather`, `site.meta.url`) albo udokumentować jako celowy fallback legacy.
- Zablokować `sidebar.banner` w strefie `home` w `components.ts` — dziś konfiguracja przechodzi walidację i psuje render.

**Kryterium wyjścia:** test kontraktowy w OmniPress walidujący wygenerowany JSON przeciw schematowi trzymanemu obok; poprawiona reguła `astro-repo-compat.mdc` (`zones`, nie `slots`).

### Porcja 2 — identyfikatory publiczne

**Decyzja produktowa:** slugi zostają **przemianowane wstecznie**, z przekierowaniami 301. Jedna konwencja w całym projekcie, bez listy wyjątków — dzięki temu walidacja może działać na całym katalogu treści, a nie tylko na zapisie.

#### Naprawa mechanizmu

- Jedna funkcja slugująca jako SSOT, z jawną mapą transliteracji (`ł→l`, `Ł→L` i pozostałe znaki bez dekompozycji NFD).
- Wymuszenie normalizacji na slugach kategorii i stron statycznych, nie tylko wpisów (P0-3).
- Test parametryzowany po pełnym polskim alfabecie.

#### Migracja wsteczna — zakres

| Obiekt | Ile | Uwagi |
|--------|-----|-------|
| Wpisy | **7 z 23** | `og-oszenie-*` ×4, `zapraszamy-do-wspo-tworzenia-*`, `plan-ogolny-gminy-informacje-szczego-owe`, `viii-…-dla-m-odziezy-*` |
| Kategorie | **2 z 4** | `zarządzenia` → `zarzadzenia`; `planogólnygminymiedzna` → `plan-ogolny-gminy-miedzna` (brak `ó` **i** brak separatorów) |
| Pole `category` we wpisach | 6 wpisów | wszystkie należące do przemianowanych kategorii |
| `href` w menu | **~10 z 57** | literały w `omnipress-layout.json`, **nie** wyliczane z kategorii |
| Pole `slug` w bazie OmniPress | 7 rekordów | musi zmienić się razem z katalogiem |

Kategorie są ważniejsze niż wpisy: slug kategorii wchodzi w ścieżkę **każdego** należącego do niej wpisu, więc `planogólnygminymiedzna` psuje sześć adresów naraz.

#### Kolejność operacji (jedna transakcja logiczna)

URL wpisu bierze się z **nazwy katalogu** w repo Astro (`entry.id` w `getStaticPaths`), nie z pola we front-matterze. Ten sam slug żyje jednak w czterech miejscach i muszą zmienić się razem:

1. Naprawić funkcję slugującą i wymusić ją na kategoriach.
2. Wyliczyć nowe slugi dla 7 wpisów i 2 kategorii (dry-run do zatwierdzenia).
3. Zaktualizować `posts.slug` w bazie **i** katalogi w repo Astro w jednej operacji.
4. Przepisać pole `category` w 6 wpisach i `href` w menu.
5. Dodać przekierowania 301 (`redirects` w `astro.config.mjs` — adapter Vercel generuje je natywnie).

**Ryzyko:** jeśli baza rozjedzie się z repo, następna edycja wpisu opublikuje go do nowego katalogu i zostawi stary jako sierotę — ten sam artykuł dwa razy na stronie. Całe ryzyko leży w kolejności kroków, nie w trudności technicznej.

**Uzasadnienie przekierowań:** to strona gminy. `og-oszenie-o-przetargu` to ogłoszenie o przetargu, `og-oszenie-o-przekazaniu-planu-ogolnego…` to dokument planistyczny. Takie adresy trafiają do pism, e-maili i BIP-u i nikt ich stamtąd nie poprawi.

**Kryterium wyjścia:** test przechodzi dla `ą ć ę ł ń ó ś ź ż` i wersji wielkich; żaden slug w repo Astro ani w `omnipress-layout.json` nie zawiera znaków spoza `[a-z0-9-]`; wszystkie stare adresy odpowiadają 301.

### Porcja 3 — siatka bezpieczeństwa repo Astro

- Workflow CI odpowiadający temu z OmniPress: `lint`, `astro check`, `test`, `build`.
- ESLint z konfiguracją zgodną z OmniPress.
- Runner testów oparty na globie zamiast ręcznej listy plików.

**Kryterium wyjścia:** CI zielone na `main` i wymagane w PR.

### Porcja 4 — higiena repo Astro

- Usunięcie śledzonych śmieci i `archived_packages/`.
- `.gitignore`: `.env*`, pliki robocze.
- Poprawa `name` i strategii wersjonowania; wyrównanie wersji Astro między repo.
- **Decyzja architektoniczna:** czy assety wpisów mają dalej trafiać do gita, czy do Blob/Storage z referencją we front-matterze — ✅ **rozstrzygnięte w podejściu 12: zostają w gicie** (P1-3), z bramką `lint-content-weight.mjs` wymuszającą rewizję przy 300 MB.

**Kryterium wyjścia:** `git ls-files` bez artefaktów; zapisana decyzja o assetach. ✅ spełnione.

### Porcja 5 — i18n i teksty UI (OmniPress)

Skan wykonany: ~268 wystąpień (P1-13), ponad 25 martwych kluczy (P2-5). Kolejność prac:

- Usunąć fallbacki `?? 'polski tekst'` w komponentach `layout-slots/` — klucze już istnieją w `admin-panels.ts`, fallback tylko maskuje ich brak.
- Przenieść teksty z `ChannelTestButton.astro` i `lib/admin/channel-test.ts` do i18n.
- Zdecydować, co z komunikatami w `throw new Error(` — czy to teksty dla użytkownika (wtedy i18n), czy diagnostyka dla logów (wtedy zostają, ale reguła musi to dopuszczać wprost).
- Wyczyścić martwe klucze.

**Kryterium wyjścia:** reguła lintu wykrywająca polskie diakrytyki poza `src/i18n/`, z jawną listą wyjątków — inaczej 268 wystąpień odrośnie.

### Porcja 6 — struktura, rozmiar plików, pokrycie testami

- Podział plików z P2-3 wzdłuż sensownych granic **albo** świadomy, zapisany wyjątek. Dziś konwencja jest po prostu martwa i to jest gorsze niż jej brak.
- Rozstrzygnąć regułę warstw (P1-10): wymusić lintem albo przeformułować. Trzecia opcja — zostawić jak jest — oznacza, że `docs/KONWENCJE.md` przestaje być wiarygodne jako całość.
- Testy dla modułów krytycznych z tabeli P1-11, zaczynając od `supabase/cookies.ts` i `middleware/pipeline.ts`.
- Załatać dziury w `lint-ui-classes.mjs` (P1-12) — szczególnie pomijanie całej linii zawierającej `ui-`.
- Scalić cztery moduły paneli załączników w jeden helper (P1-14).
- Wyciągnąć logikę z `pages/admin/index.astro` (49 linii frontmatter, 4 zapytania Supabase) i `pages/dashboard/posts/[id].astro` (~84 linie) do `lib/`.

**Kryterium wyjścia:** brak plików ponad 200 linii bez wpisu na liście wyjątków; testy dla wszystkich modułów krytycznych; reguła warstw albo egzekwowana, albo poprawiona.

### Porcja 7 — bezpieczeństwo i uprawnienia

- **Testy integracyjne RLS** — ✅ zrobione w podejściu 10 (`src/lib/supabase/rls.integration.test.ts`, 22 przypadki, opt-in przez `RLS_TEST_DATABASE_URL`). Wykryły P0-7.
- Szyfrowanie i rotacja tokenów GitHub/Vercel (`ENCRYPTION_KEY`).
- CSP z nonce, nagłówki HTTP, origin check, rate limit auth — weryfikacja na produkcji, nie w kodzie.
- Walidacja uploadu po magic bytes, limity rozmiaru.
- Przegląd `.admin-password.txt` i `scripts/tmp-*` pod kątem danych, które nie powinny leżeć na dysku.

**Kryterium wyjścia:** zestaw testów RLS potwierdzający, że redaktor nie sięgnie poza przypisane strony.

### Porcja 8 — dokumentacja jako SSOT

- Wyrównanie [STATUS.md](./STATUS.md) i [README.md](./README.md) do stanu faktycznego (P2-2).
- Usunięcie martwych treści o WordPressie z `docs/OMNIPRESS.md` i `.omnipress.json` w repo Astro.
- Poprawa reguły `astro-repo-compat.mdc`.

**Kryterium wyjścia:** skrypt weryfikujący, że każdy `setup:*` z `package.json` ma wiersz w tabeli migracji i odwrotnie — inaczej rozjedzie się znowu.

### Porcja 9 — pełna ścieżka publikacji

Jeden wpis przechodzący całą drogę: szkic → akceptacja → commit GitHub → build Vercel → render na stronie, z weryfikacją każdego artefaktu po drodze. Jedyna porcja wychwytująca błędy niewidoczne dla analizy statycznej.

**Kryterium wyjścia:** scenariusz E2E obejmujący oba repo, uruchamialny na żądanie.

---

## Wniosek nadrzędny

Struktura kontraktu jest zdrowsza, niż sugerowałby stan dokumentacji: wszystkie ID komponentów mają odpowiedniki po obu stronach, kształt `zones` się zgadza, strony statyczne są symetryczne. Problem leży gdzie indziej i ma jedną wspólną przyczynę.

**Każda znaleziona awaria to miejsce, gdzie obie strony są gotowe, ale nikt ich nie połączył — i nic tego nie zgłasza.** `pinned` jest w schemacie repo Astro i w konfiguracji slota, ale OmniPress go nie zapisuje. `terytGmina` ma typ w OmniPress i obsługę w widgecie pogody, ale nie przechodzi przez parser. Slugi mają jedną funkcję normalizującą, której kategorie nie wywołują. Schemat Zod nie jest `.strict()`, więc nadmiarowe pola znikają bez śladu. Za każdym razem system woli po cichu zrobić nic, niż krzyknąć.

Do tego dochodziła asymetria zabezpieczeń: cała siatka jakości (CI, lint, 354 testy) była po stronie OmniPress, a repo Astro przyjmowało zapisy bez żadnej weryfikacji. Efekt: rozjazd wychodził na jaw dopiero jako brakująca sekcja na stronie gminy. Domknięte w dwóch krokach — CI i lint w repo Astro (podejście 7), walidacja wejścia layoutu i front-matteru (podejście 14).

Porcje 1, 3 i 8 są dlatego ważniejsze niż pozostałe — każda dokłada mechanizm, który wykryje następny rozjazd sam. Bez nich kolejny audyt znajdzie nowy zestaw tych samych klas błędów.

Decyzja o wstecznej zmianie slugów (porcja 2) upraszcza porcję 3: skoro po migracji obowiązuje jedna konwencja, walidacja slugów może objąć cały katalog treści i wejść do CI bez listy wyjątków.

---

## Powiązane dokumenty

- [STATUS.md](./STATUS.md) — stan implementacji
- [KONWENCJE.md](./KONWENCJE.md) — konwencje kodu
- [WDROZENIE.md](./WDROZENIE.md) — bootstrap techniczny
- [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc) — kontrakt między repozytoriami
