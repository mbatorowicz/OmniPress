# OmniPress — wdrożenie (krok po kroku)

## Logowanie (najprościej)

1. Wejdź na **https://omni-press.vercel.app/login**
2. Wpisz **e-mail** i **hasło** (bez linków z maila).
3. Hasło administratora: plik **`.admin-password.txt`** w folderze projektu (po `npm run setup:password`).

### Zapomniałem hasła

1. **https://omni-press.vercel.app/login?mode=reset**
2. Podaj e-mail → link w skrzynce → ustaw nowe hasło (min. 8 znaków).

**Link prowadzi na `localhost:3000`?**

- W pasku adresu zamień na: **`https://omni-press.vercel.app/auth/reset-password?code=...`**
- Trwała naprawa: Supabase → **Site URL** = `https://omni-press.vercel.app` → `npm run setup:auth-urls`

### Nowe hasło od zera

```powershell
cd "ścieżka\do\OmniPress"
npm run env:pull
npm run setup:password
```

Hasło w `.admin-password.txt`.

---

## Vercel + Supabase

1. Integracja Vercel ↔ Supabase: **pusty** Custom Prefix.
2. `npm run env:pull` — zmienne lokalnie.
3. `npm run setup:remote` — baza + strona + admin.

### Site URL Supabase

- **Site URL:** `https://omni-press.vercel.app`
- **Redirect URLs:** `https://omni-press.vercel.app/**`, `/auth/callback`, `/auth/reset-password`

Lub: `SUPABASE_ACCESS_TOKEN` w `.env.local` → `npm run setup:auth-urls`

---

## Migracje SQL (kolejność)

Na istniejącej bazie uruchamiaj tylko brakujące:

```powershell
npm run setup:storage
npm run setup:phase3
npm run setup:phase4
npm run setup:categories
npm run setup:layout
npm run setup:storage-pdf
npm run setup:storage-docx
npm run setup:storage-gpkg
npm run setup:storage-xlsx-zip
npm run setup:asset-display
npm run setup:asset-sort
npm run setup:remove-wordpress
npm run setup:profiles-guard
```

Świeża baza: `setup:remote` stosuje schemat początkowy; potem pozostałe migracje w kolejności dat.

**Auth (obowiązkowo po wdrożeniu):** `npm run setup:auth-urls` — Site URL, redirecty, **wyłączenie publicznej rejestracji** i potwierdzenie MFA TOTP (wymaga `SUPABASE_ACCESS_TOKEN` w `.env.local`).

**MFA (administrator):** Na hosted Supabase **TOTP jest domyślnie włączone** — sprawdź: `npm run verify:auth-mfa`. Wymuszenie w dashboardzie (gdy wyłączone): `npm run setup:auth-mfa` lub Dashboard → **Auth → MFA**. Po wdrożeniu kodu administrator przy pierwszym logowaniu skonfiguruje authenticator (`/auth/mfa/setup`), potem przy każdej sesji poda kod (`/auth/mfa`).

**Rate limit auth:** `npm run setup:auth-rate-limits` (fallback Supabase). Weryfikacja: `npm run verify:auth-rate-limits`. Zalecane na produkcji: **Upstash Redis** (Vercel Marketplace) — zmienne `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**Asset SHA (optymalizacja transferów):** `npm run setup:assets-content-sha` — kolumna `assets.content_sha` do pomijania niezmienionych załączników przy publikacji/imporcie.

---

## Token GitHub (fine-grained PAT)

Zamiast classic PAT (`ghp_…`) użyj **fine-grained personal access token** (`github_pat_…`):

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**
2. **Resource owner** = właściciel repozytorium strony
3. **Repository access** → **Only select repositories** → wyłącznie repo strony (np. `gmina-miedzna.pl`)
4. **Permissions:** Contents = **Read and write**, Metadata = **Read**
5. Ustaw **datę wygaśnięcia**

Panel OmniPress ostrzega przy teście kanału, gdy wykryje classic PAT, i pokazuje repo, do którego token ma dostęp.

---

## Zmienne Vercel (Production)

| Zmienna | Opis |
|---------|------|
| `CRON_SECRET` | Losowy string — cron → `/api/worker/publish` |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker — **nie** w UI |
| `ENCRYPTION_KEY` | Szyfrowanie tokenów GitHub/Vercel (base64, 32 bajty) |
| `VERCEL_TOKEN` | Opcjonalnie — weryfikacja buildu strony Astro |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Opcjonalnie (zalecane prod) — współdzielony rate limit auth |

Bez `ENCRYPTION_KEY`: konfiguracja jednostki zapisze się, ale **tokeny nie** (tylko dev).

Cron: `vercel.json` → worker raz dziennie (backup). Publikacja startuje też **od razu po akceptacji**.

---

## Gdy coś nie działa

| Problem | Rozwiązanie |
|--------|-------------|
| localhost:3000 w mailu | Popraw Site URL w Supabase |
| Zły e-mail/hasło | `npm run setup:password` |
| Brak /admin | `npm run setup:password` (rola admin) |
| Publikacja failed | Logi w podglądzie wpisu → Ponów publikację |
| Worker nie działa | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, redeploy |

---

## Podręczniki

- [ADMIN.md](./ADMIN.md)
- [REDAKTOR.md](./REDAKTOR.md)
- [STATUS.md](./STATUS.md)
