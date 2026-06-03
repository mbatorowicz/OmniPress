# OmniPress — wdrożenie (krok po kroku)

Instrukcja dla osoby bez doświadczenia technicznego. Resztę (kod, zmienne w aplikacji) obsługuje repozytorium.

---

## Część A — Vercel + Supabase (ok. 5 minut)

### 1. Połącz Supabase z Vercel

1. Wejdź na [vercel.com](https://vercel.com) → projekt **omni-press** (lub OmniPress).
2. **Settings** → **Integrations** → **Supabase** → **Connect**.
3. Wybierz swój projekt Supabase (ten sam, który utworzyłeś dla OmniPress).
4. Zaznacz środowiska: **Production**, **Preview**, **Development** — wszystkie trzy.
5. **Custom Prefix — zostaw PUSTE** (nie wpisuj `STORAGE`).
6. Kliknij **Connect**.

Aplikacja sama odczyta zmienne `SUPABASE_URL` i `SUPABASE_ANON_KEY` z integracji — nie musisz ich kopiować ręcznie.

### 2. Podłącz GitHub (jeśli jeszcze nie)

1. W Vercel: **Add New** → **Project** → import **mbatorowicz/OmniPress**.
2. Framework: **Astro** (wykryje automatycznie).
3. **Deploy**.

Po każdej zmianie w kodzie na GitHub Vercel zbuduje stronę sam.

---

## Część B — baza danych (automatycznie z terminala)

Jeśli masz Vercel CLI (już zalogowane):

```powershell
cd "ścieżka\do\OmniPress"
npm run env:pull
npm run setup:remote
```

Opcjonalnie z własnym hasłem zamiast zaproszenia e-mail:

```powershell
$env:ADMIN_EMAIL="twoj@email.pl"
$env:ADMIN_PASSWORD="TwojeSilneHaslo123!"
npm run setup:remote
```

Skrypt sam: stosuje migrację SQL, tworzy stronę „UG Miedzna”, ustawia admina.

### Ręcznie (gdy skrypt nie działa)

1. Supabase → **SQL Editor** → wklej `supabase/migrations/20250603000000_initial_schema.sql` → **Run**.
2. **Authentication** → **Users** → dodaj użytkownika.
3. SQL z `supabase/seed.example.sql` (rola admin).

---

## Część C — sprawdzenie

1. Otwórz adres Vercel projektu (np. `https://omni-press.vercel.app`).
2. Powinna pojawić się strona logowania.
3. Zaloguj się e-mailem i hasłem z kroku 5.
4. Powinieneś trafić do **Administracja** (`/admin`).

Jeśli widzisz „Konfiguracja wymagana” — w Vercel zrób **Redeploy** (Deployments → ⋮ → Redeploy) po podłączeniu Supabase.

---

## Naprawa: przekierowanie na localhost:3000

Supabase ma złą **Site URL**. Ustaw raz ręcznie:

1. Otwórz: [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/tseticasatzviqhthwbr/auth/url-configuration)
2. **Site URL:** `https://omni-press.vercel.app`
3. **Redirect URLs** — dodaj (każda linia osobno lub przecinkiem):
   - `https://omni-press.vercel.app/**`
   - `https://omni-press.vercel.app/auth/callback`
   - `http://localhost:4321/**` (opcjonalnie, dev)
4. **Save**.

**Masz już link z tokenem w pasku adresu?** Zamień tylko początek adresu:

- Było: `http://localhost:3000/#access_token=...`
- Wklej: `https://omni-press.vercel.app/auth/callback#access_token=...`  
  (reszta po `#` bez zmian) → Enter.

Potem wyślij nowy link: `node scripts/send-login-link.mjs` (po poprawie Site URL).

## Gdy coś nie działa

| Problem | Co zrobić |
|--------|-----------|
| **localhost:3000** po logowaniu | Sekcja wyżej (Site URL w Supabase) |
| Biały ekran / błąd po logowaniu | Sprawdź, czy migracja SQL z kroku 3 przeszła bez błędu |
| „Konfiguracja wymagana” | Integracja Supabase w Vercel + Redeploy |
| Nie widać /admin | Uruchom SQL z kroku 5 (`role = admin`) |
| Zły prefiks w integracji | Usuń prefiks `STORAGE`, zapisz, Redeploy |

---

## Lokalnie na komputerze (opcjonalnie)

Tylko jeśli chcesz testować u siebie:

1. Skopiuj `.env.example` → `.env`
2. Z Supabase → **Settings** → **API** skopiuj **Project URL** i **anon public** do `.env` jako `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY`
3. W terminalu w folderze projektu: `npm install` → `npm run dev`

---

*Kolejne fazy (edytor, publikacja WP/Astro) dojdą w następnych aktualizacjach kodu.*
