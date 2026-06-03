# OmniPress — wdrożenie (krok po kroku)

## Logowanie (najprościej)

1. Wejdź na **https://omni-press.vercel.app/login**
2. Wpisz **e-mail** i **hasło** (bez linków z maila).
3. Hasło administratora jest w pliku **`.admin-password.txt`** w folderze projektu na Twoim komputerze (generowane poleceniem `npm run setup:password`).

### Zapomniałem hasła

1. Na stronie logowania: **„Zapomniałem hasła / pierwsze logowanie”**
2. Podaj e-mail → link w skrzynce → ustaw nowe hasło (min. 8 znaków).

### Nowe hasło od zera (terminal)

```powershell
cd "ścieżka\do\OmniPress"
npm run env:pull
npm run setup:password
```

Otwórz `.admin-password.txt` — tam jest e-mail i hasło.

---

## Vercel + Supabase

1. Integracja Vercel ↔ Supabase: **pusty** Custom Prefix.
2. `npm run env:pull` — zmienne lokalnie.
3. `npm run setup:remote` — baza + strona UG + admin.

### Naprawa przekierowania (localhost:3000)

**Ręcznie (2 min):** [URL Configuration w Supabase](https://supabase.com/dashboard/project/tseticasatzviqhthwbr/auth/url-configuration)

- **Site URL:** `https://omni-press.vercel.app`
- **Redirect URLs:** `https://omni-press.vercel.app/**` oraz `/auth/callback` i `/auth/reset-password`

**Lub z tokenem:** [Account tokens](https://supabase.com/dashboard/account/tokens) → dodaj `SUPABASE_ACCESS_TOKEN=sbp_...` do `.env.local` → `npm run setup:auth-urls`

---

## Gdy coś nie działa

| Problem | Rozwiązanie |
|--------|-------------|
| localhost:3000 | Popraw Site URL w Supabase (wyżej) |
| Zły e-mail/hasło | `npm run setup:password` i plik `.admin-password.txt` |
| Link z maila nie działa | Użyj logowania hasłem na `/login` |
| Brak /admin | `npm run setup:password` (ustawia rolę admin) |
