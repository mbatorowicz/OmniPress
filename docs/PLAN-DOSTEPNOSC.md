# Plan naprawy dostępności (WCAG)

**SSOT:** jak dojść do WCAG 2.1 AA na stronie gminy i w panelu OmniPress.  
**Audyt:** 2026-09-16, staging `gmina-miedzna.cncsolutions.dev` + `omni-press.cncsolutions.dev`.  
**Kryterium docelowe:** WCAG 2.1 poziom AA (ustawa z 4 kwietnia 2019 r.) oraz wybrane 2.2 AA (rozmiar celu 2.5.8).  
**Oznaczenia repo:** **A** = OmniPress, **B** = `gmina-miedzna.pl`.

Każde **podejście** jest samodzielne: jeden zakres, weryfikacja, commit (w B: `git pull` na starcie). Kolejność 1–4 jest wiążąca (krytyczne luki AA). 5–8 można przestawiać. DNS cutover **poza zakresem**.

| # | Podejście | Repo | Ryzyko | Blokuje | Status |
|---|-----------|------|--------|---------|--------|
| 1 | Panel: etykiety checkboxów w kolejce | A | niskie | — | ✅ |
| 2 | Panel: kontrast tokenów tekstu | A | niskie | — | ✅ |
| 3 | Strona: własny 404 po polsku | B | niskie | 8 | ✅ |
| 4 | Strona: wysoki kontrast (kategorie + fokus) | B | niskie | 8 | ✅ |
| 5 | Strona: `h1` homepage + skip-link z fokusem | B | niskie | 8 | ✅ |
| 6 | Strona: sterowanie WCAG, linki, czcionka | B | niskie | 8 | ✅ |
| 7 | Panel: szkielet a11y (skip, main, edytor) | A | niskie | 8 | ✅ |
| 8 | Deklaracja dostępności + ponowny skan | A+B | zerowe | — | ✅ |
| 9 | Strona: HC żółto-czarny — reszta tekstu i swatche | B | niskie | — | ✅ |
| 10 | PDF OCR + audyt WCAG (axe, klawiatura, HC, mobile) | B | niskie | — | ✅ |

Poza zakresem tego planu: certyfikat PDF/UA / PAC 2024 dla wszystkich formularzy, DNS cutover (wykonany 2026-09-16).

---

## Rejestr znalezisk (D-*)

Identyfikatory używane w podejściach. Priorytet: P1 = blokuje AA, P2 = luka AA, P3 = 2.2 / jakość.

### Strona (repo B)

| ID | P | Kryterium | Problem |
|----|---|-----------|---------|
| D-1 | P1 | 3.1.1, 2.4.2 | 404 Vercel po angielsku (`lang="en"`), bez layoutu gminy |
| D-2 | P1 | 1.4.3 | HC: kategorie na kafelkach czarne na czarnym (`.post-meta .category` → `--color-primary: #000`) |
| D-3 | P1 | 2.4.7, 1.4.11 | HC: `--color-wcag-focus: #000` — niewidoczny obrys |
| D-4 | P2 | 1.3.1, 2.4.6 | Homepage bez `h1` („Aktualności” jest `h3`) |
| D-5 | P2 | 2.4.1 | Skip-link przewija, nie przenosi fokusu (`#main-content` bez `tabindex="-1"`) |
| D-6 | P2 | 1.4.1 | Linki w akapicie deklaracji tylko kolorem (`link-in-text-block`) |
| D-7 | P2 | 2.5.8 | Przyciski kontrastu/czcionki ~22×22 px (wymóg 24×24) |
| D-8 | P2 | 1.4.4 | Domyślny `html { font-size: 90% }` ≈ 14,4 px |
| D-9 | P3 | 1.3.1 / region | Pasek WCAG poza landmarkiem |
| D-10 | P3 | 1.3.1, 4.1.2 | Brak `aria-pressed` na aktywnym kontraście/czcionce |
| D-11 | P3 | 2.3.3 | `scroll-behavior: smooth` bez `prefers-reduced-motion` |
| D-12 | P3 | 1.4.11 | Obrys fokusu `#fca311` na bieli ~2:1 (trzeba ≥ 3:1) |

### Panel (repo A)

| ID | P | Kryterium | Problem |
|----|---|-----------|---------|
| D-13 | P1 | 1.3.1, 4.1.2 | Checkboxy wierszy kolejki bez nazwy (`name="post_id"`) |
| D-14 | P1 | 1.4.3 | `ui-muted` / `ui-lead` / `ui-caption` / `ui-hint` poniżej 4,5:1 (`#64748b`, `#94a3b8`) |
| D-15 | P2 | 1.3.1, 2.4.1 | `/login` bez `<main>` i skip-linka |
| D-16 | P2 | 2.4.1 | Brak skip-linka w `BaseLayout` / `AppLayout` |
| D-17 | P2 | 4.1.2 | Przycisk linku w TipTap: ikona + `title`, bez `aria-label` |
| D-18 | P3 | 1.4.3 | Numer wersji na logowaniu — za słaby kontrast |
| D-19 | P3 | 2.3.3 | Brak `prefers-reduced-motion` w panelu |

### Strona — follow-up HC (2026-09-16, po podejściu 4)

| ID | P | Kryterium | Problem |
|----|---|-----------|---------|
| D-20 | P1 | 1.4.3 | HC: `--color-primary: #000` jako kolor tekstu — „Zobacz starsze”, tytuły ogłoszeń, CERT, pogoda (czarny na czarnym) |
| D-21 | P2 | 1.4.1 / 1.4.11 | Przyciski kontrastu identyczne: `.bg-standard` brało `--color-wcag-bg` (w HC też czarne) |
| D-22 | P2 | 1.4.3 | HC: kremowe tła alertów (`#fffbeb`) — żółty tytuł CERT na kremie ~1:1 |

Część alarmów axe `color-contrast` na homepage w HC była prawdziwa (D-20), nie tylko skan w trakcie `transition`. Tytuły kafelków i A+/A− są żółte po ustabilizowaniu; linki/widgety z `color: var(--color-primary)` ginęły.

---

## Podejście 1 — panel: etykiety checkboxów (D-13)

**Cel:** każdy checkbox w kolejce ma dostępną nazwę. Czytnik nie ogłasza „niezaznaczone, pole wyboru”.

**Kroki**

1. `src/components/admin/queue/PostsTableRow.astro` — na `input[name=post_id]` dodać `aria-label` z i18n, np. `Wybierz: {tytuł}` (tytuł już jest w wierszu; przy pustym tytule użyć `common.untitled`).
2. Tekst tylko w `src/i18n/pl/` (kolejka / admin), zero hardkodu w `.astro`.
3. „Zaznacz wszystkie” już ma `aria-label` — nie ruszać kontraktu `data-select-all`.

**Weryfikacja:** axe na `/admin` — 0× `label`; Tab + czytnik: nazwa zawiera tytuł wpisu. `npm test`.

**Commit:** A.

---

## Podejście 2 — panel: kontrast tokenów (D-14, D-18)

**Cel:** tekst pomocniczy spełnia 4,5:1 na tle karty/tabeli.

**Kroki**

1. W `src/styles/global.css` podnieść `--color-text-muted` i `--color-text-subtle` (dziś `#64748b` / `#94a3b8`). Docelowo muted ≥ 4,5:1 na `#fff` i na `surface-subtle` (praktycznie slate-600 / ok. `#475569` albo ciemniej). Subtle używany w caption — albo ten sam próg, albo caption nie jest jedyną informacją.
2. Sprawdzić `ui-muted`, `ui-lead`, `ui-caption`, `ui-hint`, stopkę wersji (`VersionBadge`).
3. Nie rozjaśniać brandu ani statusów — tylko tokeny szarości.

**Weryfikacja:** axe `/admin`, `/admin/users`, `/admin/usage`, ekran akceptacji wpisu — 0× `color-contrast` na tych klasach. Porównać czytelność tabeli w przeglądarce.

**Commit:** A (może iść razem z 1).

---

## Podejście 3 — strona: własny 404 (D-1)

**Cel:** nieistniejący URL zostaje w layoucie gminy, po polsku.

**Kroki**

1. Repo B: `git pull`.
2. Dodać `src/pages/404.astro` (Astro) z `Layout`, `lang` z layoutu, `h1` np. „Nie znaleziono strony”, link do `/` i `/kontakt`.
3. Napisy w komponencie strony — w B nie ma i18n OmniPress; tekst polski w jednym miejscu (komponent albo mały moduł copy), bez duplikowania w trzech plikach.
4. Upewnić się, że Vercel serwuje tę stronę (Astro `404.astro` → output Vercel). Sprawdzić `/nie-ma-takiej-strony` **i** `/gmina/kontakt/` (trailing slash / zła ścieżka).

**Weryfikacja:** HTTP 404, `lang="pl"`, skip-link + `h1`, brak angielskiego „404: Not Found”. `npm test` + `npm run build` w B.

**Commit:** B.

---

## Podejście 4 — strona: wysoki kontrast (D-2, D-3)

**Cel:** motyw żółto-czarny nie gubi treści ani fokusu.

**Kroki**

1. W `[data-theme="high-contrast"]` nadpisać kolory, które dziś idą na `--color-primary: #000`: `.post-meta .category`, hover tytułu (`.post-card:hover .post-title`), inne miejsca z `var(--color-primary)` na jasnym tekście.
2. `--color-wcag-focus: #ffff00` w HC (albo żółty 3 px na czarnym). W motywie standardowym fokus zostawić na podejście 6/osobno D-12.
3. Sprawdzić topbar, menu, stopkę, przyciski A+/A− po **ustabilizowaniu** (bez skanu w trakcie `transition`).

**Weryfikacja:** klik „kontrast żółto-czarny”, odczekać 0,5 s, axe + zrzut. Kategorie i fokus widoczne. `npm run build` w B.

**Commit:** B.

---

## Podejście 5 — strona: `h1` i skip-link (D-4, D-5)

**Cel:** każda strona ma jeden `h1`; skip-link przenosi klawiaturę do treści.

**Kroki**

1. `src/pages/index.astro` — pierwszy tytuł sekcji (np. „Aktualności”) jako `h1`; kolejne sekcje `h2`. Albo osobny `h1` „Strona główna” / nazwa gminy (sr-only lub widoczny) — byle jeden, bez luki `h1`→`h3`.
2. `Layout.astro`: `#main-content` z `tabindex="-1"`. Po aktywacji skip-linka fokus na `main` (natywny `#id` wystarczy, gdy element jest focusable).
3. `:focus` na `main` bez grubego obrysu w środku layoutu — `outline: none` na `:focus:not(:focus-visible)` albo tylko gdy `:target`.

**Weryfikacja:** axe homepage — 0× `page-has-heading-one`. Tab → skip-link → Enter → `document.activeElement` to `#main-content`; kolejny Tab idzie w treść, nie wraca na topbar.

**Commit:** B.

---

## Podejście 6 — strona: sterowanie WCAG, linki, czcionka (D-6–D-10, D-12)

**Cel:** narzędzia dostępności i treść spełniają AA / 2.5.8.

**Kroki**

1. **Linki w tekście (D-6):** w treści stron (`.post-body a`, markdown) podkreślenie stale, nie tylko `:hover`. Deklaracja dostępności przestaje wpadać w `link-in-text-block`.
2. **Cel 24×24 (D-7):** `.wcag-btn` min. 24×24 px (padding), koła kontrastu mogą zostać 16 px wizualnie wewnątrz większego trafienia.
3. **Czcionka (D-8):** `html` bazowo 100% (16 px); `large` / `xlarge` jako 112% / 125% (albo 125% / 150%). Zaktualizować `wcag-boot.js` / `wcag-controls.js` jeśli progi nazw się zmienią — nie psuć zapisanych wartości w `localStorage`.
4. **`aria-pressed` (D-10):** kontrast standard vs HC; ewentualnie stan czcionki jako `aria-pressed` albo `aria-live` przy zmianie. JS w `wcag-controls.js`.
5. **Fokus standardowy (D-12):** `--color-wcag-focus` o kontraście ≥ 3:1 do bieli (ciemniejszy pomarańcz / granat urzędowy), nie `#fca311`.
6. **Landmark (D-9):** topbar w `<header>` albo `role="banner"` / scalenie z istniejącym `header` — bez dwóch `banner` na stronie.

**Weryfikacja:** axe deklaracji — 0× `link-in-text-block`. Pomiar przycisków ≥ 24 px. Domyślny computed `font-size` 16 px. Fokus widoczny na bieli.

**Commit:** B.

---

## Podejście 7 — panel: szkielet a11y (D-15, D-16, D-17, D-19)

**Cel:** ta sama higiena co na stronie: skip, landmark, nazwane przyciski, mniej ruchu.

**Kroki**

1. Skip-link + `#main-content` (`tabindex="-1"`) w `AppLayout`; na logowaniu owinąć kartę w `<main>` (`AuthLayout`).
2. Style skip-linka: istniejące `ui-*` albo krótka klasa w `src/styles` (nie duplikować magicznych z-index).
3. Teksty i18n (`layout.skipToContent` itd.).
4. `PostRichEditor.astro`: przycisk linku — `aria-label={toolbar.link}` (tytuł może zostać). Ikona `aria-hidden`.
5. `@media (prefers-reduced-motion: reduce)` — wyłączyć `active:scale`, długie transition; analogicznie D-11 w B jeśli nie weszło w 6.

**Weryfikacja:** axe `/login` — 0× `landmark-one-main`. Skip na `/admin` działa jak na stronie. Przycisk linku w edytorze ma nazwę.

**Commit:** A. D-11 (strona) jeśli jeszcze otwarte — commit B albo dołączyć do 6.

---

## Podejście 8 — deklaracja + ponowny skan

**Cel:** deklaracja i staging zgadzają się ze stanem po naprawach.

**Kroki**

1. Ponowny skan axe (te same URL co 2026-09-16: home, aktualności, deklaracja, kontakt, artykuł, HC, mobile; panel: login, `/admin`, dashboard, posts, users, usage, akceptacja).
2. Klawiatura: skip, wyszukiwarka, menu, HC, kolejka checkboxów.
3. Repo B: `src/content/pages/gmina/deklaracja-dostepnosci/index.md` — data przeglądu, status zgodności (pełna / częściowo — jeśli PDF archiwalne zostają, nadal „częściowo”), lista pozostałych ograniczeń.
4. Ten plik: odhaczyć podejścia w tabeli na górze.

**Weryfikacja:** zero P1; P2 albo naprawione, albo jawne w deklaracji. `npm test` + `npm run build` w A i B.

**Stan 2026-09-17:** D-1–D-22 naprawione. Badanie WCAG 2.1 AA na stagingu (axe-core 4.10): 0 naruszeń na home, deklaracji, kontakcie, drukach, harmonogramie, aktualnościach, 404, motywie HC i mobile 390 px. Skip-link przenosi fokus do `#main-content`. 143 PDF-y: język `pl-PL` i tytuł; skany A4 z warstwą OCR. Pozostaje „częściowo zgodna” (mapy planu ogólnego, brak pełnych tagów PDF/UA).

**Commit:** B (treść deklaracji); A tylko jeśli zmienia się ten plan.

---

## Podejście 9 — strona: HC follow-up (D-20, D-21, D-22)

**Cel:** motyw żółto-czarny rozróżnia przyciski kontrastu i nie gubi napisów poza kafelkami.

**Kroki**

1. `--color-primary` / `--color-secondary` w HC → `#ffff00` (to token tekstu i akcentu, nie tła menu).
2. `--nav-bar-bg: #000` w `chrome-tokens.css`, żeby pasek menu został czarny.
3. `--color-on-primary` (standard: biel, HC: czerń) zamiast hardcoded `color: white` na przyciskach i plakietkach.
4. Swatche: białe kółko vs żółto-czarny gradient — bez `var(--color-wcag-bg)`; `[aria-pressed=true]` z tłem.
5. `high-contrast.css`: alerty CERT/pogoda bez kremu; modal wyszukiwarki z żółtą ramką.

**Weryfikacja:** oba kółka kontrastu różne; „Zobacz starsze”, ogłoszenia, CERT widoczne. `npm test` + `npm run build` w B.

**Commit:** B (+ ten plan w A).

---

## Podejście 10 — PDF OCR + badanie WCAG (2026-09-17)

**Cel:** zdjąć z deklaracji dwa dawne ograniczenia (ślepe skany A4 i brak badania poza samooceną). Status zostaje „częściowo zgodna” przez mapy i brak PDF/UA.

**Kroki**

1. Inwentaryzacja 143 PDF-ów: 17 skanów (22 strony A4 + mapy QGIS), 124 z tekstem.
2. OCR Tesseract `pol` na skanach A4 (pominięte płótna > 2000 pt — mapy planu ogólnego). Język `pl-PL` i tytuł na wszystkich.
3. Opis słowny map w artykułach konsultacji / opiniowania (uzasadnienie i prognoza obok).
4. Badanie staging `gmina-miedzna.cncsolutions.dev`: axe-core 4.10 (WCAG 2.1 A/AA + wybrane 2.2), klawiatura (skip), HC, mobile 390 px.

**Wynik HTML:** 0 naruszeń axe na home, deklaracji, kontakcie, drukach, harmonogramie, aktualnościach, 404, motywie HC i mobile. Skip-link → `#main-content`. Przyciski WCAG ≥ 24 px, `html` 16 px, jeden `banner`, kategorie w HC żółte.

**Commit:** B (PDF + deklaracja); A (ten plan, STATUS, komunikat).

---

## Kolejność sesji

1. **Sesja panel (A):** podejścia 1 + 2 (ew. 7 w tej samej, jeśli starczy czasu).
2. **Sesja strona (B):** 3 → 4 → 5 (P1/P2 strukturalne).
3. **Sesja dopieszczenie (B, potem A):** 6 + reszta 7 + D-11.
4. **Zamknięcie:** 8.

Środowisko weryfikacji: wyłącznie staging `*.cncsolutions.dev`, nie `gmina-miedzna.pl`.

---

## Weryfikacja zbiorcza (QA)

| Check | Gdzie |
|-------|--------|
| `npm test` | A i B |
| `npm run build` | A i B |
| axe 2.1 AA | URL z audytu 2026-09-16 |
| Klawiatura | skip, search, menu, HC, checkboxy kolejki |
| Mobile 390 px | hamburger `aria-expanded`, cele 24 px |
| Deklaracja | treść = rzeczywisty status |

Nie kończyć na samym axe — potwierdzić skip-link i HC w przeglądarce (fałszywe alarmy kontrastu przy `transition`).
