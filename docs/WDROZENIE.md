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

## Część B — baza danych (Supabase, ok. 10 minut)

### 3. Uruchom schemat bazy

1. [supabase.com](https://supabase.com) → Twój projekt.
2. Menu **SQL Editor** → **New query**.
3. Otwórz na komputerze plik z repozytorium:  
   `supabase/migrations/20250603000000_initial_schema.sql`
4. Skopiuj **całą** zawartość → wklej w SQL Editor → **Run**.

Przy sukcesie zobaczysz komunikat bez czerwonego błędu.

### 4. Włącz logowanie e-mailem

1. Supabase → **Authentication** → **Providers**.
2. **Email** — włączone (Enable).
3. Na start możesz wyłączyć „Confirm email”, żeby od razu móc się zalogować (opcjonalnie).

### 5. Twoje konto administratora

1. **Authentication** → **Users** → **Add user** → wpisz swój e-mail i hasło.
2. Kliknij utworzonego użytkownika i **skopiuj UUID** (długi identyfikator).
3. Wróć do **SQL Editor** i uruchom (podmień `TWOJ_UUID` i e-mail):

```sql
insert into public.sites (name, slug)
values ('UG Miedzna', 'ug-miedzna')
on conflict (slug) do nothing;

update public.profiles
set role = 'admin',
    default_site_id = (select id from public.sites where slug = 'ug-miedzna')
where id = 'TWOJ_UUID';
```

---

## Część C — sprawdzenie

1. Otwórz adres Vercel projektu (np. `https://omni-press.vercel.app`).
2. Powinna pojawić się strona logowania.
3. Zaloguj się e-mailem i hasłem z kroku 5.
4. Powinieneś trafić do **Administracja** (`/admin`).

Jeśli widzisz „Konfiguracja wymagana” — w Vercel zrób **Redeploy** (Deployments → ⋮ → Redeploy) po podłączeniu Supabase.

---

## Gdy coś nie działa

| Problem | Co zrobić |
|--------|-----------|
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
