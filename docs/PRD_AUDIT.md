# Audyt PRD OmniPress

Data: 2025-06-03 · SSOT wyników przeglądu wymagań. Wymagania docelowe: [PRD.md](../PRD.md).

## Werdykt

Stack (Astro SSR + Supabase + Vercel) jest **adekwatny**. Własny produkt ma sens — nisza multi-dest (WP + Astro, wiele `sites`, Zero Trust) nie jest dobrze pokryta przez gotowe CMS-y.

**PRD wymagał doprecyzowania** przed Fazą 4 (dispatcher). Poprawki wdrożono w PRD §3.1, §5.3.1, §5.4.1, §7, §10–§12.

## Luki logiczne (najważniejsze)

| Luka | Ryzyko | Status w PRD |
|------|--------|--------------|
| `post.status` vs `publish_logs` per destynacja | Fałszywe „opublikowany” przy częściowym sukcesie | §5.3.1 |
| Brak kolejki / retry publikacji | Timeout Vercel, utrata zadań | §3.1 |
| Slug bez UNIQUE(site_id, slug) | Kolizje WP/Astro | §6.1 |
| Dual publish bez reguł SEO | Duplikacja w Google | §5.4.1 |
| Odrzucenie bez wymaganego `rejection_note` | Redaktor bez kontekstu | §4.2 |
| Zmiana `site_id` po `pending` | Publikacja na złą stronę | §5.2 |
| Cofnięcie tylko WP | Niesymetria Astro | §5.3 |
| Powiadomienia e-mail | Redaktor musi odświeżać panel | §0 (poza MVP) |

## Bezpieczeństwo — luki zamknięte w PRD

- Model zagrożeń (§7.1)
- `SERVICE_ROLE_KEY` tylko skrypty CI, nie runtime UI (§9)
- MFA admin przed Fazą 4 (§4.2)
- SSRF allowlist hostów destynacji (§7)
- Sanitization MD→HTML (§5.3)
- Audit admin actions (§7)
- Storage: public read vs signed URL — decyzja w §7

## Alternatywy (kiedy nie rezygnować z OmniPress)

| Obszar | Pożycz z gotowca |
|--------|------------------|
| Sekrety destynacji | Supabase Vault / Doppler (alternatywa dla własnego AES) |
| Kolejka publish | Inngest, Trigger.dev, Vercel Cron + worker |
| MFA / Passkeys admin | Supabase Auth MFA |
| Edytor WYSIWYG | TipTap (Faza 2.5 — opcjonalnie) |

**Nie zastępuje OmniPress:** Contentful, Sanity, Decap — nie rozwiązują dispatchera WP+Astro z Zero Trust.

## Rozjazdy implementacja vs PRD (stan na audit)

| PRD (przed) | Kod | Decyzja |
|-------------|-----|---------|
| TipTap WYSIWYG | Textarea Markdown | MVP = Markdown; TipTap → Faza 2.5 (PRD §5.1) |
| Passkeys admin | E-mail/hasło | Bootstrap OK; MFA przed Fazą 4 |
| §10 Faza 1 `[ ]` | Zrobione | Zaktualizowano §10–§12 |

## Kolejność prac po audycie

1. ~~Aktualizacja PRD~~ (wykonane)
2. Faza 3: akceptacja/odrzucenie, CRUD sites/destinations
3. Faza 4: dispatcher z kolejką (§3.1)
4. Opcjonalnie: TipTap, passkeys, powiadomienia e-mail
