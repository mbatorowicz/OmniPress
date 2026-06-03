# Migracja WP → Astro (runbook)

Procedura operacyjna dla UG Miedzna. Wymagania SEO: [PRD.md §5.4.1](../PRD.md).

**Status:** 📋 runbook — publikacja techniczna w [STATUS.md](./STATUS.md) (Faza 4).

---

## Fazy migracji

| Faza | WP | Astro | SEO |
|------|----|-------|-----|
| **A — równolegle** | Produkcja publiczna | Staging (Vercel Auth + `noindex`) | Canonical → WP |
| **B — przełączenie** | Dezaktywacja wpisu / redirect | Produkcja publiczna | Canonical → Astro |
| **C — docelowo** | Wyłączony kanał | Główny kanał | Tylko Astro |

---

## Faza A (dziś — po Fazie 4 dispatchera)

1. Admin publikuje na **WP** (produkcja) + opcjonalnie **Astro staging**.
2. Staging Astro:
   - Vercel Authentication (ograniczenie dostępu).
   - `noindex` w meta / `robots.txt` — **nie indeksować** testów.
3. Canonical na domenie WP pozostaje główny.

---

## Faza B — przełączenie DNS (checklist)

- [ ] Jakość treści i layoutu Astro zaakceptowana merytorycznie.
- [ ] Wszystkie ważne artykuły zmigrowane lub opublikowane na Astro.
- [ ] DNS / domena wskazuje na Astro (Vercel).
- [ ] Canonical i sitemap wskazują Astro.
- [ ] Wpisy WP dezaktywowane (nie usuwane w OmniPress) — admin w panelu WP lub przez dispatcher (Faza 4).
- [ ] Weryfikacja Google Search Console po 2–4 tygodniach.

---

## Faza C

- Destynacja WP: `is_active = false` w OmniPress lub usunięta z mapowania strony.
- Redaktorzy nadal pracują tylko w OmniPress.

---

## Odpowiedzialność

| Rola | Zadanie |
|------|---------|
| Admin OmniPress | Publikacja, mapowanie destynacji |
| Admin IT / Vercel | DNS, Auth staging, env |
| Redaktor | Treść w OmniPress — bez dostępu do WP/Git |
