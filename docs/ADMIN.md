# Podręcznik administratora

Operacyjny przewodnik po panelu OmniPress. Wymagania produktowe: [PRD.md](../PRD.md). Co jest już zbudowane: [STATUS.md](./STATUS.md).

**URL produkcji:** https://omni-press.vercel.app/admin

---

## 1. Pierwsza konfiguracja (kolejność)

**Jednostka organizacyjna:** `/admin/units/new` lub edycja z listy stron — nazwa, slug, repozytorium GitHub (Astro) i opcjonalnie weryfikacja deployu Vercel w jednym formularzu.

```mermaid
flowchart LR
  unit[Jednostka + GitHub] --> editors[Redaktorzy user_sites]
  editors --> ready[Gotowe do treści]
```

1. **Jednostka** — np. „UG Miedzna”, repo `mbatorowicz/gmina-miedzna.pl`, layout `folder`, ścieżka `src/content/news`.
2. **Redaktor** (`/admin/editors`) — przypisz strony + domyślna strona.
3. Redaktor loguje się na `/login` → `/dashboard`.

Szczegóły wdrożenia technicznego: [WDROZENIE.md](./WDROZENIE.md).

---

## 2. Strony (`/admin/sites`)

| Pole | Opis |
|------|------|
| Nazwa | Wyświetlana w panelu |
| Slug | Identyfikator techniczny (`a-z`, `0-9`, myślnik) |
| Aktywna | Nieaktywna strona — bez nowych wpisów (docelowo) |

Edycja jednostki (GitHub, layout, import): `/admin/units/[id]`.

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

## 4. Redaktorzy (`/admin/editors`)

- Zaznacz **dostępne strony**.
- Ustaw **domyślną stronę** (używaną przy „+ Nowy artykuł”).
- Redaktor widzi **tylko własne** wpisy; nie widzi tokenów.

---

## 5. Akceptacja wpisów

1. `/admin` → sekcja *Do akceptacji* → wpis.
2. **Zaakceptuj:** *Zaakceptuj i przygotuj publikację* — publikacja na repozytorium strony.
   - Status wpisu: `publishing` (kolejka w tle).
   - `publish_logs`: `pending` → worker → `success` / `failed` (retry automatyczny).
   - Po sukcesie: `published`.
3. **Odrzuć:** obowiązkowe uwagi → redaktor widzi `rejection_note` i może poprawić szkic.

Na podglądzie wpisu: tabela **Status publikacji**. Przy błędzie (`failed`): **Ponów publikację**.

---

## 6. Layout i import

- **Layout Astro:** `/admin/units/[id]/layout` — menu, kategorie, sloty → sync do GitHub.
- **Import wpisów z GitHub:** `/admin` → synchronizacja (wpisy już na stronie).
- **Ostatnie zmiany:** `/admin/units/[id]/changes`.

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
