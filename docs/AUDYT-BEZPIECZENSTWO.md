# Audyt bezpieczeństwa — plan wykonania

**SSOT** znalezisk i naprawy (2026-09-07, OmniPress `0.12.1`). Canvas sesji: nie jest SSOT — ten plik jest.

Kolejność **S-1 → S-2 → S-3 → S-4** jest wiążąca. Każde podejście = jedna sesja: kod + test + build + commit (oba repo, gdy kontrakt).

Oznaczenia: **A** = OmniPress, **B** = `gmina-miedzna.pl`.

| # | Podejście | Repo | Waga | Blokuje |
|---|-----------|------|------|---------|
| S-1 ✅ | Sanityzer całego dokumentu (nie tag po tagu) | A | **wysoka** | S-2 (stare commity i tak wymaga CSP) |
| S-2 ✅ | Strona: `rehype-sanitize` + CSP / XFO / HSTS | B | **wysoka** | — |
| S-3 ✅ | Bucket `post-assets` prywatny + signed URL | A (+ Storage) | **wysoka** | — |
| S-4 ✅ | Panel: escape nazw, Origin na POST, IP z hopa Vercel | A | średnia | po S-1 |

**Następna sesja:** S-1–S-4 i audyt kategorii (22–25) zamknięte. Następny krok projektu: DNS cutover — tylko na wyraźną prośbę.

Kategorie wpisów (AUDYT-WYKONANIE 22–25) zostają otwarte, ale **nie zaczynaj od nich**, dopóki S-1 i S-2 nie są zamknięte — XSS na stronie gminy jest ważniejszy niż flow kategorii.

Po zamknięciu podejścia: oznacz ✅ w tabeli, dopisz „Wykonano” z commitem, zaktualizuj [AUTH.md](./AUTH.md) / [WDROZENIE.md](./WDROZENIE.md) jeśli zmiana dotyczy sesji, Storage albo nagłówków.

---

## Rejestr znalezisk

### B-1 — Stored XSS: sanityzer zostawia `a`/`div` (potwierdzone)

`stripRawHtmlTags` w `src/lib/content/sanitize.ts` woła `sanitizeHtml` **na pojedynczym tagu**. Dla `a` i `div` handler oddaje oryginał (`return match`), więc `onclick` i `javascript:` zostają w `sanitizeStorageMarkdown` i `sanitizePublishMarkdown`.

Podgląd panelu (`markdownToSafeHtml` → `sanitizeHtml` na całym dokumencie) te same pary często wycina. Administrator widzi czysty wpis i publikuje truciznę.

Niezamknięty `<div onmouseover>` przeżywa nawet pełny `sanitizeHtml`.

### B-2 — `rehype-raw` bez CSP na stronie

Repo B: `astro.config.mjs` — `rehypePlugins: [rehypeRaw, …]`. Brak CSP, `X-Frame-Options`, HSTS w kodzie. HTML z B-1 staje się DOM w przeglądarce mieszkańca.

### B-3 — Publiczny bucket `post-assets`

Migracja `20250604000000_storage_post_assets.sql`: `public = true`. Szkice i PDF z danymi są pod `/storage/v1/object/public/…`. Ścieżka ma UUID (trudna enumeracja); wyciek URL (markdown, referrer, logi) = odczyt nieopublikowanego pliku.

### B-4 — `innerHTML` z nazwą pliku w panelu

`src/lib/editor/gallery-panel.ts`, `file-attachment-panel.ts` — `filename` i `url` bez escape. CSP panelu (nonce, brak `unsafe-inline` w `script-src`) blokuje skrypt, nie injekcję HTML.

### B-5 — CSRF: brak Origin = OK; mutacje poza auth bez Origin

`isCrossOriginPost` (`src/lib/auth/origin.ts`) przy braku `Origin` zwraca `false`. `/api/posts/*` i `/api/admin/*` nie wołają `guardSameOriginPost`. SameSite=Lax ogranicza klasyczny POST z obcej domeny.

### B-6 — Rate limit ufa `x-real-ip`

`src/lib/auth/rate-limit.ts` — najpierw `x-real-ip`, potem pierwszy hop `X-Forwarded-For`. Na Vercel hop jest zwykle nadpisywany; w innym froncie da się rozjechać limiter.

### B-7 — MFA tylko admin

Redaktor bez TOTP. Przejęte konto + B-1 wystarczy do podłożenia XSS (akceptacja admina).

### B-8 — Worker: `err.message` + porównanie sekretu

`src/lib/api/worker.ts` — treść wyjątku w JSON 500; `authorization !== Bearer ${secret}` nie jest stałoczasowe.

### Świadomie poza naprawą (nie otwierać jako task)

- `/api/search.json` — indeks opublikowanych wpisów, nie szkiców.
- `joinContentPath` bez normalizacji `..` — slug to `[a-z0-9-]`, ścieżki destynacji ustawia admin z PAT.
- RLS, trigger `profiles_guard`, upload magic bytes, AES-GCM na PAT, enumeracja e-maili — działają; nie „naprawiać” bez nowej evidencji.

---

## Podejście S-1 — sanityzer całego dokumentu

**Cel:** zapis i publikacja nie przepuszczają zdarzeń ani `javascript:` w HTML. Podgląd = to, co idzie na GitHub.

**Kroki (repo A)**

1. Zastąpić własny regex w `src/lib/content/sanitize.ts` parserem (DOMPurify albo ten sam model tagów, ale **zawsze na całym fragmencie**, nigdy tag po tagu). `stripRawHtmlTags` usunąć.
2. Jedna ścieżka: `sanitizeStorageMarkdown` / `sanitizePublishMarkdown` / `sanitizeHtml` / `sanitizeEditorHtml` — ten sam rdzeń, różne allowlisty (jak dziś EDITOR vs PUBLISH + blok PDF).
3. Escape atrybutów w bloku PDF (`pdfEmbedHtml` już escapuje — nie psuć).
4. Testy w `sanitize.test.ts` **muszą** obejmować przypadki, które dziś przechodzą:
   - `div` z `onclick` (para i niezamknięty)
   - `a href="javascript:…"`
   - `p` z `onclick` (już czyszczony — regresja)
   - `script`
   - zachowany blok `op-pdf-viewer` + skrypt viewera przy publikacji
5. Nie dodawać `rehype-raw` w A. Nie ruszać jeszcze bucketu.

**Weryfikacja:** `npm test` (w tym nowe case’y) · `npm run lint` · `npm run build`. Ręcznie: zapis szkicu z wklejonym HTML zdarzeniowym → w bazie i w podglądzie brak handlerów.

**Commit:** tylko A. Po scaleniu zaktualizować ten plik (S-1 ✅) i [CHANGELOG.md](../CHANGELOG.md).

**Wykonano (2026-09-07, `d68d629`):** `parse5` parsuje cały fragment; `stripRawHtmlTags` usunięty. Jeden rdzeń (`sanitizeHtml`) dla zapisu, publikacji, podglądu i edytora — allowlisty EDITOR / PUBLISH + blok PDF bez zmian. Testy: `div`/`a` z handlerami (para i niezamknięty), `javascript:`, `p onclick`, `script`, embed PDF.

---

## Podejście S-2 — obrona strony (repo B)

**Cel:** nawet stary commit z HTML w markdownie nie wykona skryptu u mieszkańca.

**Kroki (repo B)** — najpierw `git pull` (`origin/main` jest SSOT).

1. Zamiast gołego `rehype-raw`: `rehype-sanitize` (albo raw + sanitize). Zostawić `rehypePostAssetUrls` **po** sanityzacji. Blok `op-pdf-viewer` i względne `./` muszą przejść allowlistę — dopisać schemat, nie wyłączać sanityzera.
2. Nagłówki na każdą odpowiedź (middleware albo `vercel.json` + adapter): `Content-Security-Policy` (bez `unsafe-inline` w `script-src`; nonce albo same hashe), `X-Frame-Options: DENY` (albo `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security` na produkcji.
3. Test: markdown z `div onclick` / `script` nie ląduje w HTML buildu; embed PDF i obrazki `./` nadal działają.
4. Lustro: [astro-repo-compat](../.cursor/rules/astro-repo-compat.mdc) — krótka nota o sanityzacji markdownu; wpis w CHANGELOG repo B.

**Weryfikacja:** `npm test` · `npm run lint` · `npm run check` · `npm run build` w B. Przeglądarka: wpis z galerią + PDF embed + DevTools → nagłówki obecne.

**Commit:** B (+ nota w A tylko jeśli reguła compat). Deploy Vercel strony po pushu.

**Wykonano (2026-09-07, `7a50feb` w B):** `rehype-raw` → `rehype-sanitize` (schemat PDF + `./`) → `rehypeSafeAssetRefs` → `rehypePostAssetUrls`. Skrypt z treści wycinany; viewer z layoutu. CSP bez `unsafe-inline` w `script-src` (WCAG i lightbox w `/public/js/`), plus XFO / nosniff / Referrer-Policy / HSTS. Testy: `sanitize-schema.test.ts`, `headers.test.ts`. Nota w `astro-repo-compat.mdc`.

---

## Podejście S-3 — prywatny Storage

**Cel:** nieopublikowany plik nie jest w internecie pod stałym publicznym URL.

**Kroki (repo A + Supabase)**

1. Nowa migracja: `post-assets` `public = false`; polityki SELECT tylko authenticated (autor / admin), jak obecne `post_assets_select`.
2. `publicAssetUrl` / `getPublicUrl` w ścieżce szkicu zastąpić signed URL (krótki TTL) albo proxy `/api/posts/[id]/assets/…/file` (już jest, z `canViewPostAssets`).
3. `completePostAssetUpload` — `fetchStorageHead` nie może iść na `/object/public/…`. Head przez klienta Storage albo signed download.
4. Publikacja na GitHub: plik i tak ląduje w repo B (`public/post-files/`) — publiczny URL strony, nie Supabase.
5. Skrypt `setup:storage-private` + wiersz w [STATUS.md](./STATUS.md) + [WDROZENIE.md](./WDROZENIE.md). Agent sam `npm run setup:…` na produkcji.
6. Testy: signed upload + complete bez public URL; brak `object/public/post-assets` w markdownie szkicu.

**Weryfikacja:** `npm test` · `npm run lint` · `npm run build`. Po migracji: stary publiczny URL szkicu → 400/403.

**Commit:** A. Migracja zastosowana na prod przez agenta.

**Wykonano (2026-09-07):** migracja `20250907000000_storage_post_assets_private.sql` (`public = false`) + `npm run setup:storage-private`, zastosowana na produkcji. Sprawdzone: `storage.buckets.public = false`, anonimowy GET na `/object/public/post-assets/…` → **400** (200 z pierwszego żądania to cache CDN sprzed migracji, TTL 1 h).

Zamiast signed URL dla panelu — **proxy** `/api/posts/{id}/assets/{assetId}/file` (istniało, `canViewPostAssets`): brak adresu z terminem ważności, który mógłby wyciec dalej niż sesja. SSOT adresu: `assetFileUrl` / `assetFileUrlFor` w `lib/publish/asset-model.ts`. `publicAssetUrl` → `legacyPublicAssetUrl`: **nie serwuje pliku**, zostaje wyłącznie jako klucz parowania starych treści (`assetUrlKeys`, `resolveAssetUrl` mapują i proxy, i legacy — publikacja starych wpisów działa bez migracji danych).

Ścieżki bez publicznego URL: `fetchStorageHead` → signed URL z `Range` (16 bajtów zamiast 50 MB) w nowym `lib/posts/upload-verify.ts`; `completePostAssetUpload` zwraca proxy; `collectPostAssetWrites` → `storage.download()` (worker: service role); galeria, PDF/DOCX/pliki i podgląd → proxy. `img-src` w CSP zawężony do `'self'` (Supabase zostaje w `connect-src`).

Testy: `publish/asset-model.test.ts`, `publish/github-astro-assets.test.ts` (pobranie bez `fetch`, mapowanie obu adresów, błąd Storage), `post-gallery.test.ts`, `posts/asset-model.test.ts`, `security/headers.test.ts`.

---

## Podejście S-4 — twardnienie panelu i auth

**Cel:** obrona w głąb po zamknięciu XSS.

**Kroki (repo A)**

1. Escape `filename` i `url` w `gallery-panel.ts` i `file-attachment-panel.ts` (textContent / `escapeHtml`, nie `innerHTML` z surową nazwą).
2. `isCrossOriginPost`: brak `Origin` na mutacji POST = odrzuć (albo wymagaj `Sec-Fetch-Site: same-origin`). `guardSameOriginPost` na `/api/posts/*` i `/api/admin/*` (albo middleware).
3. `clientIp`: na Vercel brać tylko hop ustawiany przez platformę; nie ufać gołemu `x-real-ip` od klienta, jeśli da się go podmienić. Testy `origin.test.ts` / `rate-limit`.
4. Opcjonalnie w tej samej sesji, jeśli zostało miejsce: MFA redaktora (produkt — nie blokować S-4); worker — stałoczasowe porównanie sekretu, bez `err.message` w JSON.
5. [AUTH.md](./AUTH.md) — Origin, IP, escape załączników.

**Weryfikacja:** `npm test` · `npm run lint` · `npm run build`. Formularz z obcym `Origin` → 403.

**Commit:** tylko A.

**Wykonano (2026-09-07):**

1. Galeria i lista załączników budują nazwę i URL przez `textContent` / `isSafeUrl` — `javascript:` i `"><img onerror>` nie wchodzą do DOM. Test: `editor/attachment-markup.test.ts`.
2. `isCrossOriginPost`: brak `Origin` = odrzuć, chyba że `Sec-Fetch-Site: same-origin`. GET nie podlega. Middleware blokuje POST/PUT/PATCH/DELETE na `/api/posts/*` i `/api/admin/*` (`api.csrf`). Auth dalej przez `guardSameOriginPost` / `guardAuthMutationRequest`. Worker cron poza zakresem.
3. `clientIp`: `x-vercel-forwarded-for`, potem pierwszy hop `X-Forwarded-For`. `x-real-ip` ignorowany.
4. Worker: `timingSafeEqual` na `Bearer`, JSON 500 bez `err.message`. MFA redaktora zostaje produktem — nie w tej sesji.

Testy: `origin`, `guard-request`, `rate-limit`, `pipeline` (CSRF), `api/worker`, `attachment-markup`. AUTH.md: Origin, IP, escape, CSRF middleware.

---

## Start kolejnego chatu

Agent czyta **ten plik** (nie canvas). Bierze pierwsze S-* bez ✅. S-1–S-4 i [AUDYT-WYKONANIE.md](./AUDYT-WYKONANIE.md) 22–25 są zamknięte — nie otwieraj DNS cutover, o ile użytkownik nie poda tego scope.

```
PM → Architect → BE/FE → DevSecOps → QA
```

QA: `npm test`, `npm run build`; przy S-2 także testy i build w B; przy S-3 migracja na prod. Commit + push po zielonym QA (ROLE_AGENT).
