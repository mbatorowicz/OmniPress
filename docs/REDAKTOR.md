# Podręcznik redaktora

Jak korzystać z panelu OmniPress: logowanie, nowy artykuł, statusy i typowe problemy.

Ta sama instrukcja jest w panelu: **Pomoc** (`/dashboard/help`). Stan funkcji: [STATUS.md](./STATUS.md).

**Adres:** https://omni-press.cncsolutions.dev/login → po zalogowaniu `/dashboard`

---

## Czym jest OmniPress

OmniPress to panel do przygotowania artykułów na stronę internetową. Piszesz tekst, dodajesz zdjęcia i pliki. Administrator sprawdza wpis — dopiero potem artykuł pojawia się na stronie.

Nie potrzebujesz dostępu do innych systemów ani znajomości technicznej. Widzisz tylko **własne** artykuły na stronach, do których administrator dał Ci dostęp.

---

## Logowanie i hasło

1. Wejdź na https://omni-press.cncsolutions.dev/login
2. Wpisz e-mail i hasło (konto zakłada administrator).
3. Kliknij **Zaloguj** — otworzy się **Panel redaktora**.

**Pierwsze logowanie albo zapomniane hasło:** na stronie logowania kliknij *Zapomniałem hasła / pierwsze logowanie*. Podaj e-mail i sprawdź skrzynkę (także spam). Nowe hasło musi mieć co najmniej 8 znaków.

**Wylogowanie:** przycisk *Wyloguj* w prawym górnym rogu.

---

## Panel redaktora (`/dashboard`)

Po zalogowaniu widzisz ścieżkę pracy, przycisk nowego artykułu i listę swoich wpisów.

| Element | Co oznacza |
|---------|------------|
| Ścieżka pracy | Szkic → Wyślij → Akceptacja → Na stronie |
| *Twoje strony* | Jednostki, na które możesz pisać |
| **+ Nowy artykuł** | Rozpoczyna nowy szkic |
| *Twoje wpisy* | Lista artykułów — kliknij tytuł, aby otworzyć |
| **Instrukcja** / **Pomoc** | Ten przewodnik w panelu |

Jeśli nie masz przypisanej strony, zamiast przycisku zobaczysz *Brak strony docelowej* — poproś administratora o dostęp.

---

## Jak utworzyć nowy artykuł

1. Na panelu kliknij **+ Nowy artykuł**.
2. Jeśli masz dostęp do kilku stron, najpierw wybierz jednostkę z listy *Strona*. Przy jednej stronie wybór nie jest potrzebny.
3. Otworzy się pusty edytor. Wybierz **kategorię** i wpisz **tytuł** — bez tego nie zapiszesz ani nie wyślesz artykułu.
4. Napisz treść. Zdjęcia i pliki dodaj w sekcjach pod edytorem.
5. Opcjonalnie ustaw datę i godzinę publikacji oraz adres w polu *Slug*.
6. Kliknij **Zapisz szkic**, jeśli chcesz dokończyć później. Albo **Wyślij do akceptacji**, gdy artykuł jest gotowy.

Przy wysyłaniu pojawi się potwierdzenie. Po wysłaniu **nie zmienisz już tekstu**, dopóki administrator nie podejmie decyzji.

---

## Pola artykułu

| Pole | Opis |
|------|------|
| Kategoria | Wymagana. Lista ze strony. Gdy jest pusta — poproś administratora. |
| Tytuł | Nagłówek artykułu na stronie. Wymagany. |
| Slug (opcjonalnie) | Krótki adres w linku, np. `komunikat-urzedu`. Puste pole = system utworzy adres z tytułu (polskie znaki zamieni na zwykłe). |
| Data publikacji + godzina | Opcjonalnie. **Puste** = po akceptacji od razu. **Data w przyszłości** = o wybranej godzinie. **Data wsteczna** = data w artykule, publikacja po akceptacji. Czas polski, godziny 6:00–20:00. |
| Treść artykułu | Edytor z pogrubieniem, kursywą, nagłówkami, listami i linkami. Zdjęcia i PDF dodaj poniżej, nie wklejaj ich w tekst. |

---

## Zdjęcia i pliki

| Sekcja | Zasady |
|--------|--------|
| Galeria zdjęć | Pierwsze zdjęcie = zajawka na liście wpisów. Kolejność strzałkami, usuwanie krzyżykiem. JPEG, PNG, WebP, GIF — max **10 MB**. |
| Załączniki PDF | Do **50 MB**. Link do pobrania albo podgląd na stronie. |
| Załączniki DOCX | Pliki Word, do **50 MB**, jako link do pobrania. |
| Pliki do pobrania | GPKG, XLSX, ZIP — do **50 MB**. Inne formaty system odrzuci. |

---

## Zapis, wysłanie i usuwanie

| Przycisk | Skutek |
|----------|--------|
| **Zapisz szkic** | Wersja robocza. Możesz wracać i poprawiać (status *Szkic* albo *Do poprawki*). |
| **Wyślij do akceptacji** | Przekazuje artykuł administratorowi. Edycja zostaje zablokowana. |
| **Usuń wpis** | Kasuje artykuł razem z plikami. Tylko *Szkic* albo *Do poprawki*. **Nie można cofnąć.** |

**Poprawka wpisu już na stronie:** jeśli administrator otworzy ponowną edycję, zapisujesz i wysyłasz znowu. Do kolejnej akceptacji na stronie zostaje poprzednia wersja.

---

## Statusy wpisu

| Status | Co możesz zrobić |
|--------|------------------|
| Szkic | Poprawiać, zapisywać, wysłać albo usunąć |
| Do akceptacji | Czekać — edycja zablokowana |
| Zaplanowany | Zaakceptowany — publikacja o wskazanej godzinie |
| Publikacja… | Czekać — trwa publikacja na stronę |
| Do poprawki | Przeczytać uwagi administratora, poprawić, wysłać ponownie |
| Na stronie | Artykuł jest publiczny. Poprawkę otwiera administrator |

---

## Po decyzji administratora

- **Do akceptacji** — administrator przeczyta artykuł i go przyjmie albo wróci z uwagami.
- **Do poprawki** — to prośba o zmiany, nie koniec pracy. Uwagi są na górze edytora.
- **Zaplanowany** — nic nie musisz robić; artykuł pojawi się o wskazanej godzinie.
- **Na stronie** — artykuł jest publiczny. Żeby go zmienić, potrzebna jest zgoda administratora.

---

## Problemy

| Problem | Co zrobić |
|---------|-----------|
| *Brak strony docelowej* / *Brak przypisanej strony* | Poproś administratora o przypisanie w `/admin/users` |
| *Brak kategorii — poproś administratora* | Administrator musi uzupełnić listę kategorii strony |
| Nie mogę edytować | Wpis jest *Do akceptacji* albo *Na stronie* (bez otwartej poprawki) |
| Upload nie działa | Sprawdź format i rozmiar (zdjęcie 10 MB, pozostałe 50 MB). Dalej — zgłoś administratorowi |
| Wpis zniknął z edycji po wysłaniu | To normalne: status *Do akceptacji*. Na liście jest podgląd, bez edycji |
| Chcę poprawić artykuł już na stronie | Poproś administratora o otwarcie poprawki |
