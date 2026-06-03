# Product Requirements Document (PRD): OmniPress

> Wcześniejsza nazwa robocza: PressPacker. Produkt docelowy: **OmniPress**.

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
- **Bezpieczna migracja:** Równoległe WP (produkcja) i Astro (staging chroniony przed indeksacją) bez duplikacji SEO w Google.

## 3. Architektura i stack

| Warstwa | Technologia |
|---------|-------------|
| Aplikacja OmniPress | Astro **SSR** + Tailwind CSS v4 |
| Hosting OmniPress | Vercel |
| Baza + Auth | Supabase (PostgreSQL, RLS, Auth) |
| Pliki redakcyjne | Supabase Storage |
| Format treści | Markdown (z edytora WYSIWYG, np. TipTap) |
| Destynacje | WordPress REST API; GitHub API → build Astro na Vercel |

## 4. Role i uprawnienia

### 4.1. Redaktor (pracownik)

- **Auth:** e-mail/hasło (ew. SSO w przyszłości).
- **Zakres:** Przypisany do jednej lub więcej **stron** (`sites`) — patrz §6.
- **Widzi:** Własne szkice w ramach dozwolonych stron; **nie** widzi `destinations`, tokenów, szkiców innych autorów (poza współdzieloną stroną — tylko własne posty).
- **Akcje:** Tworzenie/edycja szkicu (`draft`), upload zdjęć, wysłanie do akceptacji (`pending`) — po `pending` brak edycji.

### 4.2. Administrator (publisher)

- **Auth:** Passkeys / WebAuthn (FIDO2) — docelowo; w Fazie 1 dopuszczalne logowanie e-mail dla bootstrapu.
- **Widzi:** Wszystkie szkice `pending` i opublikowane; zarządzanie `sites`, `destinations`, mapowaniem `site_destinations`.
- **Akcje:** Odrzucenie, akceptacja, wybór destynacji do publikacji (checkboxy **ograniczone do strony szkicu**), publikacja, cofnięcie/dezaktywacja na WP.

## 5. Kluczowe funkcjonalności

### 5.1. Edytor treści (Workspace) — Faza 2

- Edytor WYSIWYG (np. TipTap) → zapis jako Markdown.
- Drag & drop zdjęć → Supabase Storage; walidacja MIME po stronie serwera.
- Nowy post automatycznie otrzymuje `site_id` z profilu użytkownika (domyślna strona) lub z wyboru przy wielu stronach.

### 5.2. Strony i destynacje — Faza 3

**Strona (`site`)** — logiczny odbiorca treści (np. „UG Miedzna”, „SP im. …”).

**Destynacja (`destination`)** — kanał techniczny (WP, GitHub-Astro).

Administrator:

- Dodaje dowolną liczbę destynacji (nazwa, typ, URL API/repo, branch, ścieżka contentu, zaszyfrowane credentials).
- Przypina destynacje do stron w `site_destinations` (flaga `is_default`, kolejność).
- Przypisuje użytkowników do stron (`user_sites` lub domyślne `site_id` w profilu).

**Automatyczne rozpoznanie celu** — nie przez analizę tekstu, le przez:

1. `post.site_id` ustawione przy utworzeniu (z profilu redaktora).
2. Przy publikacji lista checkboxów = tylko destynacje powiązane z `post.site_id`.
3. RLS uniemożliwia utworzenie posta dla strony, do której użytkownik nie ma dostępu.

### 5.3. Silnik multi-publishing (Dispatcher) — Faza 4

- Admin zaznacza destynacje (domyślnie zaznaczone `is_default` dla danej strony).
- Osobne zadania asynchroniczne per destynacja → `publish_logs`.
- **WordPress:** media z Storage → WP REST → MD→HTML → publikacja; cofnięcie: draft/trash/delete przez API.
- **GitHub-Astro:** frontmatter + `.md` + obrazy → commit na branch → build Vercel.

### 5.4. Migracja WP → Astro

- Faza przejściowa: publikacja na **WP (produkcja)** + opcjonalnie **Astro (staging)**.
- Faza docelowa: głównie Astro; WP — dezaktywacja/usunięcie wpisu per artykuł.
- Staging Astro: Vercel Authentication (lub równoważne), brak indeksacji testowych treści.

## 6. Model danych (PostgreSQL)

### 6.1. Tabele

| Tabela | Główne kolumny | Opis |
|--------|----------------|------|
| `profiles` | `id` (FK auth.users), `role`, `display_name`, `default_site_id` | Profil po rejestracji |
| `sites` | `id`, `name`, `slug`, `is_active` | Strona logiczna (gmina, szkoła…) |
| `user_sites` | `user_id`, `site_id` | Many-to-many: dostęp redaktora do stron |
| `destinations` | `id`, `name`, `type`, `config` (JSON), `encrypted_credentials`, `is_active` | WP / github_astro; bez jawnych tokenów w API |
| `site_destinations` | `site_id`, `destination_id`, `is_default`, `sort_order` | Mapowanie strona → kanały |
| `posts` | `id`, `site_id`, `author_id`, `title`, `slug`, `content_md`, `status`, `rejection_note` | `draft` \| `pending` \| `published` \| `rejected` |
| `assets` | `id`, `post_id`, `storage_path`, `mime_type`, `filename` | Załączniki graficzne |
| `publish_logs` | `id`, `post_id`, `destination_id`, `status`, `external_id`, `response_summary`, `published_at` | Audyt per destynacja |

Typy destynacji (`destinations.type`): `wordpress`, `github_astro`.

Konfiguracja w `config` (JSON, nieencrypted): np. `repo`, `branch`, `content_path`, `wp_rest_base`.

### 6.2. Przepływ przypisania

```
Użytkownik → user_sites / default_site_id
     ↓
Nowy post → site_id (automatycznie)
     ↓
Admin akceptuje → checkboxy z site_destinations WHERE site_id = post.site_id
     ↓
Dispatcher → publish_logs per wybrana destynacja
```

### 6.3. Przykłady konfiguracji

| Strona | Destynacje typowe |
|--------|-------------------|
| UG Miedzna | WP (produkcja, default), GitHub → gmina-miedzna.pl (staging) |
| Szkoła X | WP szkoły lub osobne repo Astro — tylko destynacje szkoły |

## 7. Bezpieczeństwo

- **RLS:** Redaktor — `posts` własne + `site_id` ∈ dozwolone; brak SELECT na `destinations`, `encrypted_credentials`.
- **Szyfrowanie:** Credentials szyfrowane AES (klucz `ENCRYPTION_KEY` tylko na serwerze Vercel); odszyfrowanie wyłącznie w Astro SSR przy publikacji.
- **Storage:** Polityki bucketu — upload tylko dla własnych postów; ścieżki z `post_id`.
- **Admin:** Operacje wrażliwe wyłącznie z roli `admin` w `profiles`.

## 8. Kamienie milowe

| Faza | Zakres | Status |
|------|--------|--------|
| **1** | Repo Astro SSR, Supabase schema + RLS, auth (login/session), szkielet layoutów | ✅ |
| **2** | Workspace redaktora, edytor MD, upload Storage | ✅ (repozytorium) |
| **3** | Panel admin: sites, destinations, akceptacja `pending` | Planowane |
| **4** | Dispatcher WP + GitHub, publish_logs, cofnięcie WP | Planowane |

## 9. Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `PUBLIC_SUPABASE_URL` | URL projektu Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Klucz anon (klient) |
| `SUPABASE_SERVICE_ROLE_KEY` | Tylko serwer (opcjonalnie, operacje admin) |
| `ENCRYPTION_KEY` | 32 bajty base64 — szyfrowanie credentials |

## 10. Kryteria akceptacji Fazy 1

- [ ] Projekt Astro buduje się z adapterem Vercel (SSR).
- [ ] Migracja SQL stosuje schemat z §6 w Supabase.
- [ ] Logowanie e-mail/hasło; sesja w middleware.
- [ ] Dashboard rozróżnia `editor` / `admin` (placeholder).
- [ ] README opisuje uruchomienie lokalne i podłączenie Supabase.
