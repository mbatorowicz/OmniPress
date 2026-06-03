# Podręcznik redaktora

Krótki przewodnik po panelu redaktora. Status funkcji: [STATUS.md](./STATUS.md).

**URL:** https://omni-press.vercel.app/login → po zalogowaniu `/dashboard`

---

## Logowanie

- E-mail i hasło od administratora.
- Zapomniałem hasła → `/login?mode=reset` (link z maila).

---

## Panel (`/dashboard`)

1. **+ Nowy artykuł** — tworzy szkic na przypisanej stronie (gdy masz wiele stron — wybierz z listy).
2. **Twoje wpisy** — lista z statusem (Szkic, Do akceptacji, itd.).

---

## Edycja wpisu (`/dashboard/posts/[id]`)

| Pole | Opis |
|------|------|
| Tytuł | Wymagany przed wysłaniem do akceptacji |
| Slug | Opcjonalnie; generowany z tytułu |
| Treść | Markdown (`##` nagłówki, `![opis](url)` obrazy) |
| Dodaj zdjęcie | Upload do Supabase (JPEG, PNG, WebP, GIF, max 10 MB) |

**Zapisz szkic** — możesz wracać i edytować.

**Wyślij do akceptacji** — po wysłaniu **nie edytujesz** do czasu decyzji admina.

---

## Po decyzji administratora

| Status | Co możesz zrobić |
|--------|------------------|
| Do akceptacji | Czekaj — edycja zablokowana |
| Odrzucony | Czytasz uwagi admina, poprawiasz, wysyłasz ponownie |
| Opublikowany | Treść zaakceptowana; publikacja na stronie gminy — Faza 4 |

---

## Problemy

| Problem | Co zrobić |
|---------|-----------|
| „Brak przypisanej strony” | Poproś admina o przypisanie w `/admin/editors` |
| Nie mogę edytować | Wpis może być w statusie *Do akceptacji* lub *Opublikowany* |
| Upload nie działa | Zgłoś adminowi (bucket Storage) |
