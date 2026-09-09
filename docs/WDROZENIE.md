# OmniPress — wdrożenie (krok po kroku)

## Logowanie (najprościej)

1. Wejdź na **https://omni-press.cncsolutions.dev/login**
2. Wpisz **e-mail** i **hasło** (bez linków z maila).
3. Hasło administratora: plik **`.admin-password.txt`** w folderze projektu (po `npm run setup:password`).

### Zapomniałem hasła

1. **https://omni-press.cncsolutions.dev/login?mode=reset**
2. Podaj e-mail → link w skrzynce → ustaw nowe hasło (min. 8 znaków).

**Link prowadzi na `localhost:3000`?**

- W pasku adresu zamień na: **`https://omni-press.cncsolutions.dev/auth/reset-password?code=...`**
- Trwała naprawa: Supabase → **Site URL** = `https://omni-press.cncsolutions.dev` → `npm run setup:auth-urls`

### Nowe hasło od zera

```powershell
cd "ścieżka\do\OmniPress"
npm run env:pull
npm run setup:password
```

Hasło w `.admin-password.txt`.

---

## Nagłówki strony publicznej (repo Astro)

Strona gminy (nie ten panel) wysyła CSP / XFO / HSTS — `src/lib/security/headers.ts` + `vercel.json` w repo `gmina-miedzna.pl`. Deploy strony: push na `main` (webhook Vercel). Audyt: [AUDYT-BEZPIECZENSTWO.md](./AUDYT-BEZPIECZENSTWO.md) S-2.

## Vercel + Supabase

1. Integracja Vercel ↔ Supabase: **pusty** Custom Prefix.
2. `npm run env:pull` — zmienne lokalnie.
3. `npm run setup:remote` — baza + strona + admin.

### Site URL Supabase

- **Site URL:** `https://omni-press.cncsolutions.dev`
- **Redirect URLs:** `https://omni-press.cncsolutions.dev/**`, `/auth/callback`, `/auth/reset-password`, `/auth/recover`

Lub: `SUPABASE_ACCESS_TOKEN` w `.env.local` → `npm run setup:auth-urls`

**SSOT adresu produkcji:** `src/config/app.ts` (`APP.productionOrigin`). Skrypty i testy czytają stamtąd (`scripts/lib/app-origin.mjs`). Po zmianie domeny **trzeba** uruchomić `npm run setup:auth-urls` — inaczej Supabase odrzuci `redirect_to` i podstawi stary Site URL, a linki resetu hasła przestaną działać.

---

## Migracje SQL (kolejność)

Na istniejącej bazie uruchamiaj tylko brakujące:

```powershell
npm run setup:storage
npm run setup:phase3
npm run setup:phase4
npm run setup:categories
npm run setup:extra-categories
npm run setup:layout
npm run setup:storage-pdf
npm run setup:storage-docx
npm run setup:storage-gpkg
npm run setup:storage-xlsx-zip
npm run setup:storage-private
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

**Storage prywatny:** `npm run setup:storage-private` — bucket `post-assets` przestaje serwować pliki anonimowo. Po migracji panel pobiera załączniki wyłącznie przez `/api/posts/{id}/assets/{assetId}/file`, a publikacja czyta bajty klientem Storage (worker: service role). Adresy `/object/public/post-assets/…` zwracają **400**, ale pliki pobrane wcześniej mogą jeszcze przez ~1 h odpowiadać z cache CDN Supabase (`cacheControl: 3600` z uploadu) — to nie jest oznaka nieudanej migracji. Kontrola: `select public from storage.buckets where id = 'post-assets'` musi dać `false`.

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
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Opcjonalnie — powiadomienie i przycisk *Akceptuj* po *Wyślij do akceptacji* |

Bez `ENCRYPTION_KEY`: konfiguracja jednostki zapisze się, ale **tokeny nie** (tylko dev).

### Telegram (powiadomienie i akceptacja)

Bez tych zmiennych wysłanie wpisu działa jak dotychczas; odznaka w panelu i tak pokazuje liczbę oczekujących.

1. W Telegramie otwórz [@BotFather](https://t.me/BotFather) → `/newbot` → nazwa i nazwa użytkownika bota.
2. Skopiuj token (`TELEGRAM_BOT_TOKEN`).
3. Napisz do bota dowolną wiadomość (czat prywatny) albo dodaj bota do grupy administratorów.
4. `TELEGRAM_CHAT_ID`: po wiadomości do bota wejdź na `https://api.telegram.org/bot<TOKEN>/getUpdates` i odczytaj `message.chat.id` (dla grupy bywa ujemne).
5. Agent dopisuje zmienne na Vercel (Production) i robi deploy.
6. `npm run setup:telegram-webhook` — rejestruje `POST /api/telegram/webhook` (przycisk *Akceptuj*). Sekret webhooka to HMAC tokenu bota, bez osobnej zmiennej.
7. `npm run setup:telegram-photo` — wgrywa znak OmniPress jako zdjęcie profilu bota (`public/brand/telegram-profile.jpg`). Ten sam znak jest faviconą panelu.

Przycisk *Akceptuj* publikuje wpis `pending` tak samo jak panel. *Odrzuć* i przypięcie — w panelu (*Otwórz w panelu*).

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
| Przycisk Akceptuj w Telegramie nie działa | `npm run setup:telegram-webhook` po deployu; `SUPABASE_SERVICE_ROLE_KEY`; czat musi być ten z `TELEGRAM_CHAT_ID` |

---

## Podręczniki

- [ADMIN.md](./ADMIN.md)
- [REDAKTOR.md](./REDAKTOR.md)
- [STATUS.md](./STATUS.md)
