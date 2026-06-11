# Podręcznik administratora

Operacyjny przewodnik po panelu OmniPress. Stan funkcji: [STATUS.md](./STATUS.md).

**URL produkcji:** https://omni-press.vercel.app/admin

---

## 0. Nawigacja panelu

- **Nagłówek** (u góry): przyciski *Administracja* (`/admin`) i *Panel treści* (`/dashboard`) — lewe menu zależy od wyboru (panel treści nie ma sidebar).
- **Sidebar** (tylko w `/admin/*`, po lewej): *Kolejka wpisów* (`/admin`), *Strony* (`/admin/sites`), *Użytkownicy* (`/admin/users`). Na mobile — pozioma belka nad treścią.
- **Breadcrumby** na każdej podstronie pokazują ścieżkę (np. `Administracja / Strony / UG Miedzna / Strony statyczne`).
- W kontekście strony (`/admin/units/[id]/*`) dodatkowe zakładki: *Edytuj*, *Layout Astro*, *Strony statyczne*, *Ogłoś zmianę*.
- `/admin` to wyłącznie kolejka wpisów — sekcje (*Do akceptacji*, *Zaplanowane*, *Opublikowane*) mają u góry podsumowanie z licznikami; wpisy w trakcie publikacji są w sekcji *Zaplanowane* ze znacznikiem **W toku**; import z GitHub jest zwijaną sekcją na dole.

---

## 1. Pierwsza konfiguracja (kolejność)

**Jednostka organizacyjna:** `/admin/units/new` lub edycja z listy stron — nazwa, slug, repozytorium GitHub (Astro) i opcjonalnie weryfikacja deployu Vercel w jednym formularzu.

```mermaid
flowchart LR
  unit[Strona + GitHub] --> editors[Użytkownicy user_sites]
  editors --> ready[Gotowe do treści]
```

1. **Strona** — np. „UG Miedzna”, repo `mbatorowicz/gmina-miedzna.pl`, layout `folder`, ścieżka `src/content/news`.
2. **Redaktor** (`/admin/users`) — utwórz konto z rolą *redaktor*, przypisz strony + domyślna strona.
3. Redaktor loguje się na `/login` → `/dashboard`.

Szczegóły wdrożenia technicznego: [WDROZENIE.md](./WDROZENIE.md).

---

## 2. Strony (`/admin/sites`)

Lista stron jako **kafelki** — kliknięcie kafelka otwiera ustawienia strony (`/admin/units/[id]`); kafelek *+ Dodaj stronę* otwiera kreator (`/admin/units/new`).

| Pole | Opis |
|------|------|
| Nazwa | Wyświetlana w panelu |
| Slug | Identyfikator techniczny (`a-z`, `0-9`, myślnik) |
| Aktywna | Nieaktywna strona — bez nowych wpisów (docelowo) |

Ustawienia strony (GitHub, layout, import): `/admin/units/[id]`.

---

## 3. Publikacja GitHub → Astro

| Pole | Przykład |
|------|----------|
| Repozytorium | `mbatorowicz/gmina-miedzna.pl` |
| Branch | `main` |
| Ścieżka contentu | `src/content/news` |
| Układ | folder (`slug/index.md`) |
| Token PAT GitHub | uprawnienia `repo` |
| ID projektu Vercel | opcjonalnie — sprawdzanie logu buildu po publikacji |

**Credentials** są szyfrowane (`ENCRYPTION_KEY` na Vercel). Bez klucza — zapis konfiguracji bez sekretów (tylko dev).

Po akceptacji wpisu worker publikuje na GitHub; opcjonalnie czeka na deploy Vercel i zapisuje błędy buildu w logach.

---

## 4. Użytkownicy (`/admin/users`)

Konta **administratorów i redaktorów** w jednym panelu (stare `/admin/editors` przekierowuje tutaj).

- **Tworzenie:** przycisk **„+ Nowy użytkownik”** otwiera okno modalne — e-mail + hasło startowe + rola (administrator / redaktor); redaktorowi zaznacz **dostępne strony** i **domyślną stronę** (używaną przy „+ Nowy artykuł”).
- **Ustawienia konta** (`/admin/users/[id]`): nazwa wyświetlana, zmiana roli, nowe hasło.
- **Uprawnienia:** redaktor — przypisane strony + domyślna; administrator — pełny dostęp.
- **Usuwanie:** konto znika, wpisy zostają w systemie (autor: „konto usunięte”). Nie można usunąć własnego konta ani ostatniego administratora.
- Redaktor widzi **tylko własne** wpisy; nie widzi tokenów.

---

## 5. Akceptacja wpisów

1. `/admin` → sekcja *Do akceptacji* → wpis.
2. **Zaakceptuj:** *Zaakceptuj i przygotuj publikację* — publikacja na repozytorium strony.
   - Jeśli data publikacji **już minęła** lub jest teraz → status `publishing`, worker startuje od razu.
   - Jeśli data w **przyszłości** → status `scheduled`, wpis w sekcji *Zaplanowane*; worker opublikuje po terminie (przy wejściu na `/admin` lub cronie Vercel).
   - `publish_logs`: `pending` (z `next_retry_at` przy harmonogramie) → worker → `success` / `failed`.
   - Po sukcesie: `published`. Data w frontmatter strony = data wybrana przez redaktora.
3. **Odrzuć:** obowiązkowe uwagi → redaktor widzi `rejection_note` i może poprawić szkic.

Na podglądzie wpisu: tabela **Status publikacji**. Przy błędzie (`failed`): **Ponów publikację**.

---

## 6. Layout, import i bulk

- **Layout Astro:** `/admin/units/[id]/layout` — menu, kategorie, jedna lista komponentów (`slots[]` w `omnipress-categories.json`: `home.*`, `sidebar.weather`, `sidebar.cert_advisories`, `sidebar.recent_changes`, `sidebar.banner` itd.) → **jeden commit** do GitHub (menu + kategorie + opcjonalnie rejestr zmian — jeden deploy Vercel). Wspólne pole kolejności (`order`) dla sidebaru. Przed sync walidacja linków wewnętrznych. `sidebar.weather` i `sidebar.cert_advisories` pobierają dane **na żywo** z API na stronie Astro (`/api/weather/warnings`, `/api/cert/advisories`) — bez syncu JSON do repo. Widget CERT zawsze dopełnia listę do limitu z panelu: feed RSS zawiera tylko komunikaty z bieżącego dnia, starsze dociągane są z listingu `moje.cert.pl/komunikaty/`.
- **Strony statyczne:** `/admin/units/[id]/pages` — treści pod stałe URL (np. `/gmina/plan-ogolny`); publikacja od razu do `src/content/pages/` w repo Astro.
- **Import wpisów z GitHub:** `/admin` → synchronizacja (wpisy już na stronie).
- **Ostatnie zmiany:** `/admin/units/[id]/changes`.
- **Bulk:** na liście opublikowanych — zaznacz wiele wpisów → dezaktywuj lub usuń (w tym z GitHub).

---

## 7. Rozwiązywanie problemów

| Problem | Działanie |
|---------|-----------|
| Publikacja `failed` | Podgląd wpisu → kolumna podsumowania (GitHub / Vercel) → **Ponów publikację** |
| Brak kategorii w edytorze | Layout → kategorie + plik `omnipress-categories.json` w repo |
| Credentials nie zapisują się | Ustaw `ENCRYPTION_KEY` na Vercel |
| Worker nie działa | Vercel: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, redeploy |

---

## 8. Powiązane dokumenty

- [REDAKTOR.md](./REDAKTOR.md)
- [AUTH.md](./AUTH.md)
- [WDROZENIE.md](./WDROZENIE.md)
