# Podręcznik redaktora

Przewodnik po panelu redaktora. Stan funkcji: [STATUS.md](./STATUS.md).

**URL:** https://omni-press.vercel.app/login → po zalogowaniu `/dashboard`

---

## Logowanie

- E-mail i hasło od administratora.
- Zapomniałem hasła → `/login?mode=reset` (link z maila).

---

## Panel (`/dashboard`)

1. **+ Nowy artykuł** — tworzy szkic na przypisanej stronie (przy wielu stronach — wybierz z listy).
2. **Twoje wpisy** — lista ze statusem (Szkic, Do akceptacji, Zaplanowany, Publikacja, Opublikowany, Odrzucony).

---

## Edycja wpisu (`/dashboard/posts/[id]`)

| Pole | Opis |
|------|------|
| Kategoria | Wymagana przed wysłaniem — lista z pliku w repo strony |
| Tytuł | Wymagany przed wysłaniem |
| Slug | Opcjonalnie; może być generowany z tytułu |
| Data publikacji + godzina | Opcjonalna — czas polski, godziny do wyboru co godzinę 6:00–20:00; wpis pojawi się na stronie po tej dacie (po akceptacji). **Bez daty** wpis zostanie opublikowany w momencie wysłania (po akceptacji) |
| Treść | Edytor WYSIWYG (TipTap) — zapis jako Markdown |
| Galeria | Zdjęcia pod wpisem; pierwsze = zajawka (cover); kolejność ↑↓; usuwanie × |
| PDF | Załączniki jako link lub podgląd osadzony |

**Zapisz szkic** — możesz wracać i edytować (status `draft` lub `rejected`).

**Wyślij do akceptacji** — po wysłaniu edycja zablokowana do decyzji admina.

**Usuń wpis** — trwale usuwa Twój wpis wraz z załącznikami (tylko status *Szkic* lub *Odrzucony*).

---

## Po decyzji administratora

| Status | Co możesz zrobić |
|--------|------------------|
| Do akceptacji | Czekaj — edycja zablokowana |
| Zaplanowany | Zaakceptowany — automatyczna publikacja o wskazanej godzinie |
| Publikacja w toku | Czekaj — worker publikuje na GitHub |
| Odrzucony | Czytasz uwagi admina, poprawiasz, wysyłasz ponownie |
| Opublikowany | Treść na stronie gminy; admin może otworzyć ponowną edycję (poprawka) |

---

## Problemy

| Problem | Co zrobić |
|---------|-----------|
| „Brak przypisanej strony” | Poproś admina o przypisanie w `/admin/users` |
| Brak kategorii na liście | Admin musi skonfigurować layout i plik kategorii w repo |
| Nie mogę edytować | Wpis może być w statusie *Do akceptacji* lub *Opublikowany* (bez reopen) |
| Upload nie działa | Zgłoś adminowi (bucket Storage) |
