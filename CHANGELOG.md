# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/).  
Wersja: **SSOT → `package.json`**. Build: **git commit** w etykiecie `semver+commit`.

## [0.7.14] — 2026-06-05

### Naprawione

- Withdraw / bulk delete z GitHub: PATCH ref używa `/git/refs/` (wcześniej błędne `/git/ref/` → 404).

## [0.7.13] — 2026-06-05

### Porządki

- Usunięto martwy komponent `PostAttachmentsEditor.astro`, skrypty debug w `scripts/`.
- Usunięto dokumentację legacy: `RUNBOOK-MIGRACJA.md`, `PRD_AUDIT.md`.
- Przepisano docs na stan faktyczny (STATUS, PRD, README, REDAKTOR, WDROZENIE).
- Dodano `npm run setup:remove-wordpress`.

## [0.7.12] — 2026-06-05

### Zmienione

- SSOT stylów UI: `src/styles/ui.css`, komponenty `src/components/ui/`.
- Refaktoryzacja paneli admin, dashboard, auth.

## [0.7.11] — 2026-06-04

### Naprawione

- Withdraw z GitHub — usuwanie całego folderu wpisu; CMS nie kasuje przy błędzie remote.
- Import pomija ponowne pobieranie niezmienionych assetów.

## [0.7.10] — 2026-06-04

### Usunięte

- WordPress z kodu, UI i bazy (`setup:remove-wordpress`).

## [0.7.9] — 2026-06-04

### Dodane

- Weryfikacja logów buildu Vercel po publikacji.

## [0.7.6–0.7.8] — 2026-06

### Zmienione

- Jednostka = strona + destynacja GitHub w jednym formularzu.
- Usunięto osobne trasy `/admin/destinations`.

## [0.7.0–0.7.5] — 2026-06

### Dodane

- Edytor WYSIWYG (TipTap), galeria, bulk dezaktywacja/usuwanie.
- Import wpisów z GitHub, czytelna lista admina, dezaktywacja pojedynczych wpisów.

## [0.5.0–0.6.0] — 2026-06

### Dodane

- Layout Astro (menu, sloty, kategorie), ostatnie zmiany.
- PDF w edytorze, poprawki opublikowanych wpisów, cover i galeria.

## [0.4.0–0.4.5] — 2026-06-03

### Dodane

- Worker publikacji, adapter GitHub-Astro, kreator jednostek.
- Panel admin Faza 3 (strony, redaktorzy, akceptacja).

Szczegóły starszych wydań — historia commitów w repozytorium.
