# Konwencje kodu OmniPress

Obowiązują przy każdej zmianie. Indeks dokumentacji: [README.md](./README.md).

## 1. Teksty i nazwy (i18n)

- **Język domyślny:** `pl` w `src/i18n/pl/`.
- **Zakaz** hardkodowania etykiet, komunikatów, tytułów stron, `confirm()`, `alert()` w komponentach i API.
- Import: `import { auth, dashboard, … } from '@/i18n'` lub helpery (`postError`, `mapAuthError`).
- Pliki językowe dzielone **po domenie** (`auth.ts`, `posts.ts`, …), każdy **krótki** (&lt; ~120 linii).
- Kody błędów w URL (`?error=no_site`) — stałe w kodzie; **treść** z i18n po stronie strony.
- Nazwa produktu w UI: `common.appName` (nie powielać stringa w wielu plikach).

## 2. Struktura katalogów

```
src/
  config/       — tylko konfiguracja techniczna (URL, build)
  i18n/pl/      — napisy UI (SSOT tekstów)
  lib/          — logika bez UI (auth, api, posts, supabase)
  lib/api/      — guardy, JSON/redirect helpers, worker cron
  lib/middleware/ — pipeline SSR (sesja, trasy)
  components/   — małe fragmenty UI
  layouts/      — szablony stron
  pages/        — trasy (cienkie: dane + i18n + layout)
```

- **Nie** mieszaj logiki biznesowej w `.astro` — przenieś do `lib/`.
- **Nie** twórz głębokich zagnieżdżeń bez potrzeby (max. 2–3 poziomy w `pages/`).

## 3. Rozmiar plików

- Docelowo **&lt; 150 linii** na plik; powyżej 200 — podziel (np. osobny komponent, `lib/`, osobny moduł i18n).
- Długi szablon → wyciągnij sekcje do `components/…`.

## 4. Logika krytyczna (nie psuć)

| Obszar | Gdzie | Uwagi |
|--------|--------|--------|
| Sesja SSR | `middleware.ts`, `lib/supabase/cookies.ts` | Zmiany tylko z aktualizacją [AUTH.md](./AUTH.md) |
| `?code=` PKCE | `lib/auth/recovery-redirect.ts` | Recovery vs callback |
| API wpisów | `requireAuth`, `lib/posts/access.ts` | RLS + helpery |
| Strony redaktora | `lib/posts/site.ts` | `loadAllowedSites` — UI i API |

## 5. Dokumentacja

- Jedna prawda na temat → jeden plik z [README.md](./README.md).
- **STATUS.md** = stan kodu; **PRD.md** = opis produktu (skrót).
- Po zmianie funkcji: STATUS + CHANGELOG (+ ADMIN/REDAKTOR jeśli dotyczy panelu).

## 6. Testy

- Logika w `lib/` → testy `*.test.ts` obok modułu (Vitest, `npm test`).
- Teksty i18n — bez testów; klucze sprawdzają TypeScript (`as const`).
- **E2E/UI** → `e2e/*.spec.ts` (Playwright, `npm run test:e2e`) — domyślnie na produkcji (`E2E_BASE_URL` zmienia cel). Selektory przez teksty z `src/i18n/pl/` (import `@/i18n/pl/...`), nie hardkoduj stringów. Testy mutujące dane **muszą sprzątać po sobie** (`finally` + delete). Cykl logowanie/wylogowanie biegnie w osobnym projekcie `auth-flows` po pozostałych — `signOut` Supabase unieważnia wszystkie sesje konta.

## 7. UI (SSOT stylów)

- **Klasy:** `src/styles/ui.css` (importuje partiale z `src/styles/ui/`) — prefiks `ui-*`.
- **Tokeny:** `src/styles/global.css` (`@theme`) — brand, surface, tekst, obramowania, link, danger, info, warning, nav depth.
- **Typografia:** `src/styles/ui/typography.css` — `ui-title-brand`, `ui-title-page`, `ui-title-preview`, `ui-nav-group-label`.
- **Treść:** `src/styles/ui/rich-content.css` — edytor TipTap i render HTML postów.
- **Layouty:** `src/layouts/` — `BaseLayout`, `PublicLayout`, `AuthLayout`, `AppLayout`.
- **Powłoka:** `src/components/shell/` — header, footer, `AdminSidebar` (stała nawigacja admina), `AdminContextNav` (kontekst jednostki). Breadcrumby: `ui/navigation/Breadcrumbs` — przekazywane przez prop `breadcrumbs` w `AppLayout`.
- **Design system:** `src/components/ui/` — podfoldery `actions/`, `feedback/`, `form/`, `table/`, `layout/`, `navigation/`.
- **Wzorce:** `src/components/shared/` — `FlashAlerts`, `ConfirmScript`.
- **Domena:** `src/components/admin/`, `src/components/posts/` — logika panelu; importują tylko `ui/` i `shell/`.
- **Logika klienta UI:** `src/lib/ui/` — `confirm.ts`, `dom.ts` (`eventTargetElement` — delegacja kliknięć, nie `instanceof HTMLElement` przy SVG), `button-markup.ts`, `flash.ts`, `icons.ts`.
- **Przyciski:** `Button.astro` i `IconButton.astro` (`src/components/ui/actions/`); warianty w `src/styles/ui/buttons.css` (`ui-btn--link`, `ui-btn--link-danger`, `ui-btn--link-ghost`). Ikony w przyciskach: `pointer-events-none` (`Icon.astro` / `icons.ts`). HTML z TS: `button-markup.ts`.
- **Teksty akcji:** `src/i18n/pl/ui.ts` — wspólne etykiety (`save`, `remove`, `confirm.removeItem`); domenowe pliki składają z `ui`.
- **Zakaz** długich stringów Tailwind i surowych utility kolorów (`text-slate-*`, `bg-red-*` itd.) w plikach domenowych — komponent `ui/*` lub klasa `ui-*`.
- **Lint:** `npm run lint` — ESLint (`src/**/*.{ts,tsx}`) + `scripts/lint-ui-classes.mjs` (kolory Tailwind w plikach domenowych).
- Importy wyłącznie przez alias `@/`.
- Wyjątki: siatki flex/grid, edytor TipTap (`rich-editor`, `tiptap`), galeria, podgląd slotów (`layout-slots-preview.css`) — klasy strukturalne; kolory tylko przez tokeny/`ui-*`.

## 8. Skrypty klienta i CSP

CSP panelu (`src/lib/security/headers.ts`) nie zawiera `unsafe-inline`. Dozwolone są tylko dwie formy:

| Forma | Kiedy | Wymóg |
|-------|-------|-------|
| `<script>` (bundlowany przez Astro) | domyślnie | trafia do `_astro/*.js` — nonce niemożliwy i niepotrzebny |
| `<script is:inline>` / `define:vars` | przekazanie danych z SSR do klienta | **musi** mieć `nonce={Astro.locals.cspNonce}` |

Astro domyślnie wstawia **małe** bundlowane skrypty wprost do HTML (`inlinedScripts` w manifeście) — taki tag nie ma nonce i przeglądarka go blokuje (objaw: przycisk nic nie robi, tylko w produkcji). Blokuje to `vite.build.assetsInlineLimit` w `astro.config.mjs` (`scripts/lib/build-inline.mjs`, test `src/lib/security/build-inline.test.ts`). **Nie zmieniaj tej opcji** bez sprawdzenia w buildzie, że `_astro/` zawiera plik `*.astro_astro_type_script_*.js` dla każdego komponentu z `<script>`.

## 9. Agent AI

Proces i odpowiedzialność: [ROLE_AGENT.md](./ROLE_AGENT.md). PRD docelowy: [PRD.md](../PRD.md). Stan kodu: [STATUS.md](./STATUS.md).
