# Autoryzacja OmniPress

## Przepływy

```mermaid
sequenceDiagram
    participant U as Użytkownik
    participant A as Astro SSR
    participant S as Supabase Auth

    U->>A: POST /api/auth/login
    A->>S: signInWithPassword
    S-->>A: session + setAll(cookies)
    A-->>U: redirect /admin lub /dashboard

    U->>A: POST /api/auth/reset
    A->>S: resetPasswordForEmail
    S-->>U: e-mail z linkiem

    U->>A: GET /auth/reset-password?code=
    A->>S: exchangeCodeForSession
    U->>A: POST /api/auth/set-password
    A->>S: updateUser + signOut
    A-->>U: redirect /login?success=
```

## Warstwy kodu

| Plik | Rola |
|------|------|
| `src/lib/supabase/cookies.ts` | Adapter `getAll`/`setAll` + merge ciasteczek w tym samym żądaniu |
| `src/lib/supabase/server.ts` | Klient SSR |
| `src/lib/auth/session.ts` | `getUser`, profil |
| `src/lib/auth/routes.ts` | Ścieżki publiczne / chronione |
| `src/i18n/pl/auth.ts` | Napisy auth (SSOT) |
| `src/i18n/map-auth-error.ts` | Mapowanie błędów Supabase |
| `src/lib/auth/require.ts` | `requireAuth(locals)` dla API |
| `src/lib/auth/recovery-redirect.ts` | Rozróżnienie `?code=` recovery vs magic link |
| `src/middleware.ts` | Sesja na każde żądanie, guard tras |
| `src/pages/api/auth/*` | Mutacje auth (POST only) |

## Zasady

1. **Logowanie i reset** — wyłącznie przez `/api/auth/*`, nigdy logika POST w `.astro`.
2. **Sesja** — ciasteczka `httpOnly`; po `signIn` używamy `data.user` z odpowiedzi.
3. **Reset hasła** — formularz serwerowy → `set-password` → wylogowanie → logowanie nowym hasłem.
4. **Link z `#access_token`** — skrypt wywołuje `/api/auth/establish-session`, potem formularz SSR.
5. **Redirect URLs** w Supabase: `https://omni-press.vercel.app/**` (Site URL = ta sama domena).
6. **`?code=`** — middleware kieruje na `/auth/reset-password` tylko przy recovery (`type=recovery`, `/login?mode=reset`); inaczej na `/auth/callback`. Link resetu powinien mieć `redirectTo` = `/auth/reset-password` (`authResetPasswordUrl()`).

## Endpointy API

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/api/auth/login` | Logowanie |
| POST | `/api/auth/reset` | Wyślij link resetu |
| POST | `/api/auth/set-password` | Zapis nowego hasła (sesja recovery) |
| POST | `/api/auth/establish-session` | Token z hash → ciasteczka |
| POST | `/api/auth/signout` | Wylogowanie |
