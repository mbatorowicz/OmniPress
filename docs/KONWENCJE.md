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
  lib/          — logika bez UI (auth, posts, supabase)
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
- **PRD** = docelowość; **STATUS.md** = stan kodu — nie mieszaj ról.
- Po fazie: STATUS + CHANGELOG + checkboxy PRD.

## 6. Testy

- Logika w `lib/` → testy `*.test.ts` obok modułu.
- Teksty i18n — bez testów; klucze sprawdzają TypeScript (`as const`).

## 7. Agent AI

Proces i odpowiedzialność: [ROLE_AGENT.md](./ROLE_AGENT.md). PRD docelowy: [PRD.md](../PRD.md). Stan kodu: [STATUS.md](./STATUS.md).
