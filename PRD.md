# Product Requirements Document (PRD): OmniPress

> Wcześniejsza nazwa robocza: PressPacker. Produkt docelowy: **OmniPress**.  
> Audyt wymagań: [docs/PRD_AUDIT.md](docs/PRD_AUDIT.md)

## 0. Zakres MVP vs później

| W zakresie MVP (Fazy 1–4) | Poza MVP (roadmap) |
|---------------------------|-------------------|
| Markdown, upload zdjęć, workflow draft→pending→published/rejected | TipTap WYSIWYG (Faza 2.5) |
| Multi-publish WP + GitHub-Astro z `publish_logs` | Wersjonowanie treści (`post_revisions`) |
| RLS, szyfrowane credentials, panel admin | Powiadomienia e-mail (akceptacja/odrzucenie) |
| SEO: noindex staging, canonical przy dual publish | SSO redaktorów |

## 1. Wstęp

OmniPress to dedykowana, bezpieczna aplikacja webowa typu **headless content manager**. Umożliwia pracownikom (redaktorom) tworzenie treści w odizolowanym środowisku i przekazanie ich administratorowi do weryfikacji. Administrator publikuje zatwierdzoną treść (wraz ze zdjęciami) na wybranych platformach docelowych — m.in. WordPress i statyczne strony Astro (GitHub + Vercel) — z jednego panelu.

### Kontekst wdrożenia (UG Miedzna)

| Środowisko | Rola |
|------------|------|
| **WordPress** | Obecna **produkcja** publicznej strony gminy |
| **Astro** ([gmina-miedzna.pl](https://github.com/mbatorowicz/gmina-miedzna.pl)) | Docelowa produkcja po osiągnięciu akceptowalnej jakości wizualnej i merytorycznej |
| **OmniPress** | Jedyny panel redakcyjny; most migracyjny WP → Astro |

Wyłączenie treści na WP następuje przez **dezaktywację lub usunięcie wpisu w WordPress** (akcja administratora na destynacji WP), bez usuwania szkicu w OmniPress ani kopii na Astro.

## 2. Cele biznesowe

- **Zero Trust:** Pracownicy nie mają dostępu do panelu WordPress ani repozytoriów GitHub docelowych stron.
- **Wydajność operacyjna:** Eliminacja ręcznego pakowania i wysyłki plików ZIP.
- **Multi-publishing:** Jeden artykuł → wiele destynacji technicznych (np. WP + Astro równolegle w fazie migracji).
- **Wielu odbiorców organizacyjnych:** Osobne strony (gmina, szkoły, inne jednostki) z automatycznym zakresem publikacji per użytkownik.
- **Bezpieczna migracja:** Równoległe WP (produkcja) i Astro (staging chroniony przed indeksacją) bez duplikacji SEO w Google (patrz §5.4.1).

## 3. Architektura i stack

| Warstwa | Technologia |
|---------|-------------|
| Aplikacja OmniPress | Astro **SSR** + Tailwind CSS v4 |
| Hosting OmniPress | Vercel |
| Baza + Auth | Supabase (PostgreSQL, RLS, Auth) |
| Pliki redakcyjne | Supabase Storage |
| Format treści | **Markdown** (MVP); opcjonalnie WYSIWYG → MD (TipTap, Faza 2.5) |
| Destynacje | WordPress REST API; GitHub API → build Astro na Vercel |

### 3.1. Orkiestracja publikacji (Faza 4)

Publikacja **nie** może polegać wyłącznie na jednym żądaniu HTTP admina (limit czasu Vercel).

- Każda destynacja = osobne zadanie w kolejce (np. Vercel Cron + endpoint worker, Supabase Edge Function, lub Inngest).
- `publish_logs.status`: `pending` → `success` | `failed` | `withdrawn`.
- Retry z backoff dla `failed`; idempotencja po `external_id`.
- Admin widzi postęp per destynacja; błąd jednej nie kasuje sukcesu innej.

## 4. Role i uprawnienia

### 4.1. Redaktor (pracownik)

- **Auth:** e-mail/hasło (ew. SSO w przyszłości).
- **Zakres:** Przypisany do jednej lub więcej **stron** (`sites`) — patrz §6.
- **Widzi:** Wyłącznie **własne** posty w ramach dozwolonych stron; **nie** widzi `destinations`, tokenów, szkiców innych autorów na tej samej stronie.
- **Akcje:** Tworzenie/edycja szkicu (`draft`), upload zdjęć, wysłanie do akceptacji (`pending`) — po `pending` brak edycji do czasu `rejected`.

### 4.2. Administrator (publisher)

- **Auth:** E-mail/hasło (bootstrap). **Przed Fazą 4:** MFA Supabase dla kont `admin`. **Docelowo:** Passkeys / WebAuthn (FIDO2).
- **Widzi:** Wszystkie posty `pending` i opublikowane; zarządzanie `sites`, `destinations`, `site_destinations`.
- **Akcje:** Odrzucenie (**wymagane** `rejection_note`), akceptacja, wybór destynacji (checkboxy z `site_destinations` dla `post.site_id`), publikacja, cofnięcie/dezaktywacja per typ destynacji (§5.3).

## 5. Kluczowe funkcjonalności

### 5.1. Edytor treści (Workspace) — Faza 2

- **MVP:** edytor Markdown (textarea) + podgląd składni w UI.
- **Opcjonalnie (Faza 2.5):** TipTap WYSIWYG → zapis jako Markdown.
- Drag & drop zdjęć → Supabase Storage; walidacja MIME i rozmiaru (max 10 MB) po stronie serwera.
- Nowy post: `site_id` z `default_site_id` lub wyboru przy wielu stronach (`user_sites` / `loadAllowedSites`).

### 5.2. Strony i destynacje — Faza 3

**Strona (`site`)** — logiczny odbiorca treści (np. „UG Miedzna”, „SP im. …”).

**Destynacja (`destination`)** — kanał techniczny (WP, GitHub-Astro).

Administrator:

- CRUD destynacji (nazwa, typ, `config`, zaszyfrowane credentials).
- Mapowanie `site_destinations` (`is_default`, `sort_order`).
- Przypisanie użytkowników (`user_sites`, `default_site_id`).

**Reguły:**

1. `post.site_id` ustawiane przy utworzeniu — **bez zmiany** po przejściu w `pending` (wyjątek: admin w Fazie 3+ — jawna akcja audytowana).
2. Checkboxy publikacji = tylko destynacje dla `post.site_id`.
3. RLS + testy: redaktor nie tworzy posta dla niedozwolonej strony; brak SELECT cudzych postów.

### 5.3. Silnik multi-publishing (Dispatcher) — Faza 4

- Admin wybiera destynacje (domyślnie `is_default` dla strony).
- Zadania asynchroniczne per destynacja → `publish_logs` (§3.1).
- **WordPress:** media → WP REST → MD→HTML (sanitized) → publikacja; cofnięcie: draft/trash przez API.
- **GitHub-Astro:** frontmatter + `.md` + obrazy → commit (strategia ścieżki: `slug` + unikalność przy konflikcie) → build Vercel.
- **Sanitization:** whitelist tagów HTML przy eksporcie do WP; brak raw script w treści.

### 5.3.1. Maszyna stanów `posts` vs `publish_logs`

| `posts.status` | Znaczenie |
|----------------|-----------|
| `draft` | Edycja przez autora |
| `pending` | Oczekuje na admina |
| `rejected` | Odrzucony, edycja po `rejection_note` |
| `published` | Co najmniej jedna destynacja opublikowana pomyślnie; szczegóły w `publish_logs` |

- UI admina pokazuje status **per destynacja** z `publish_logs`.
- `posts.status = published` gdy admin zatwierdził publikację i **wszystkie wybrane** logi są `success` lub admin akceptuje stan częściowy (komunikat w UI).
- Częściowy błąd: logi `failed` dozwolone przy `published` tylko z widocznym ostrzeżeniem i możliwością retry.

### 5.4. Migracja WP → Astro

- Faza przejściowa: WP (produkcja) + opcjonalnie Astro (staging).
- Faza docelowa: głównie Astro; WP — dezaktywacja per artykuł.

### 5.4.1. SEO przy dual publish

- **Staging Astro:** Vercel Authentication + `noindex` w meta / robots.
- **Produkcja WP:** canonical na domenę WP do czasu przełączenia DNS.
- Po przełączeniu na Astro: canonical na Astro; wpis WP dezaktywowany (nie duplikat indeksowany).
- Procedura przełączenia DNS opisana w runbooku wdrożenia (docs).

## 6. Model danych (PostgreSQL)

### 6.1. Tabele

| Tabela | Główne kolumny | Opis |
|--------|----------------|------|
| `profiles` | `id`, `role`, `display_name`, `default_site_id` | Profil po rejestracji |
| `sites` | `id`, `name`, `slug`, `is_active` | Strona logiczna |
| `user_sites` | `user_id`, `site_id` | Dostęp redaktora |
| `destinations` | `id`, `name`, `type`, `config`, `encrypted_credentials`, `is_active` | WP / github_astro |
| `site_destinations` | `site_id`, `destination_id`, `is_default`, `sort_order` | Mapowanie |
| `posts` | `id`, `site_id`, `author_id`, `title`, `slug`, `content_md`, `status`, `rejection_note` | Workflow redakcyjny |
| `assets` | `id`, `post_id`, `storage_path`, `mime_type`, `filename` | Załączniki |
| `publish_logs` | `id`, `post_id`, `destination_id`, `status`, `external_id`, `response_summary`, `published_at` | Audyt per destynacja |

**Constraints (do migracji Fazy 3+):** `UNIQUE (site_id, slug)` gdzie `slug IS NOT NULL`.

Typy: `destinations.type` ∈ `wordpress`, `github_astro`.

### 6.2. Przepływ przypisania

```
Użytkownik → user_sites / default_site_id
     ↓
Nowy post → site_id (automatycznie)
     ↓
Admin akceptuje → checkboxy z site_destinations WHERE site_id = post.site_id
     ↓
Kolejka → publish_logs per destynacja (§3.1)
```

### 6.3. Przykłady konfiguracji

| Strona | Destynacje typowe |
|--------|-------------------|
| UG Miedzna | WP (produkcja, default), GitHub → gmina-miedzna.pl (staging) |
| Szkoła X | WP szkoły lub osobne repo Astro |

## 7. Bezpieczeństwo

### 7.1. Model zagrożeń (skrót)

| Zagrożenie | Mitigacja |
|------------|-----------|
| Redaktor eskaluje uprawnienia | RLS + brak SERVICE_ROLE w UI |
| Wyciek credentials | AES / Vault; brak tokenów w logach i API |
| SSRF z URL destynacji | Allowlist hostów w `config` |
| XSS w treści | Sanitization MD→HTML |
| Kompromitacja konta admin | MFA przed Fazą 4; passkeys docelowo |

### 7.2. Wymagania

- **RLS:** Redaktor — własne `posts` + dozwolone `site_id`; brak SELECT na `destinations` / `encrypted_credentials`.
- **Szyfrowanie:** AES-GCM (`ENCRYPTION_KEY` na Vercel) lub Supabase Vault; odszyfrowanie tylko w workerze publikacji.
- **Storage:** Upload tylko do własnych postów `draft`; decyzja MVP: public read bucket vs signed URL — dokumentować w [docs/AUTH.md](docs/AUTH.md) / wdrożeniu.
- **Admin:** Operacje wrażliwe tylko `role = admin`; audit log akcji (akceptacja, publikacja, edycja destynacji) — tabela lub rozszerzone `publish_logs` / `audit_events` (Faza 3+).
- **Walidacja:** MIME, rozmiar pliku, długość pól; rate limit auth (Supabase).

## 8. Kamienie milowe

| Faza | Zakres | Status |
|------|--------|--------|
| **1** | Astro SSR, schema + RLS, auth, layouty | ✅ |
| **2** | Workspace redaktora, Markdown, Storage | ✅ |
| **2.5** | TipTap (opcjonalnie) | Roadmap |
| **3** | Admin: sites, destinations, akceptacja/odrzucenie | ✅ |
| **4** | Dispatcher + kolejka + publish_logs + cofnięcie WP | Planowane |

## 9. Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `PUBLIC_SUPABASE_URL` | URL Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Klucz anon (JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Tylko** skrypty bootstrap/CI — **zakaz** w runtime panelu |
| `ENCRYPTION_KEY` | 32 bajty base64 — szyfrowanie credentials |

## 10. Kryteria akceptacji — Faza 1

- [x] Astro buduje się z adapterem Vercel (SSR).
- [x] Migracja SQL stosuje schemat §6.
- [x] Logowanie e-mail/hasło; sesja w middleware.
- [x] Dashboard rozróżnia `editor` / `admin`.
- [x] README + docs wdrożenia.

## 11. Kryteria akceptacji — Faza 2

- [x] Redaktor tworzy szkic z poprawnym `site_id`.
- [x] Zapis treści i upload obrazów (Storage).
- [x] Wysłanie do akceptacji (`pending`); brak edycji w `pending`.
- [x] Admin podgląda wpis `pending`.
- [x] Teksty UI w `src/i18n/pl/`.

## 12. Kryteria akceptacji — Faza 3

- [x] Admin: CRUD `sites` (UI + RLS).
- [x] Admin: CRUD `destinations` + szyfrowane credentials (gdy `ENCRYPTION_KEY`).
- [x] Mapowanie `site_destinations` i `user_sites`.
- [x] Akceptacja/odrzucenie `pending` z `rejection_note`.
- [ ] Testy integracyjne RLS (automatyczne).

## 13. Kryteria akceptacji — Faza 4

- [ ] Dispatcher z kolejką (§3.1); retry i `publish_logs`.
- [ ] Publikacja WP + GitHub-Astro dla UG Miedzna.
- [ ] Cofnięcie/dezaktywacja WP z panelu.
- [ ] Staging Astro: noindex + Vercel Auth.
- [ ] Alerty / widoczność `publish_logs.failed` dla admina.

## 14. NFR i observability

- **Dostępność:** OmniPress na Vercel — SLA zgodnie z planem Vercel.
- **Backup:** Supabase point-in-time (konfiguracja projektu).
- **Logi:** `publish_logs.response_summary` bez sekretów; monitoring błędów `failed`.
- **RODO:** Retencja kont użytkowników — procedura poza MVP (runbook).
