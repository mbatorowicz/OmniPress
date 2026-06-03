# Audyt PRD OmniPress

Data pierwotna: 2025-06-03 · [PRD.md](../PRD.md) · stan kodu: [STATUS.md](./STATUS.md)

## Werdykt (aktualizacja)

Stack (Astro SSR + Supabase + Vercel) jest **adekwatny**. Własny produkt ma sens dla multi-dest WP + Astro z Zero Trust.

**PRD = kontrakt docelowy.** Rozjazdy z kodem są **normalne** w trakcie budowy — nie oznaczają słabej dokumentacji, o ile [STATUS.md](./STATUS.md) je śledzi.

Poprawki PRD z audytu wdrożono w §3.1, §5.3.1, §5.4.1, §7, §10–§13. Faza 3 zrealizowana w kodzie (v0.3.0).

## Luki — status

| Luka | PRD | Kod / docs |
|------|-----|------------|
| Maszyna stanów `published` vs logi | §5.3.1 (+ stan przejściowy F3) | 🟡 approve → published + pending logs |
| Kolejka publish | §3.1 | ⬜ Faza 4 |
| SEO / DNS runbook | §5.4.1 | 📋 [RUNBOOK-MIGRACJA.md](./RUNBOOK-MIGRACJA.md) |
| MFA admin | §4.2 | ⬜ przed F4 |
| Audit log | §7 | ⬜ |
| Testy RLS integracyjne | §12 | ⬜ |
| Powiadomienia e-mail | §0 poza MVP | ⬜ |

## Co dodać w dokumentacji (kolejność)

1. ~~STATUS.md, ADMIN.md, REDAKTOR.md~~ ✅
2. Po Fazie 4: rozszerzyć ADMIN.md o dispatcher, STATUS, WDROZENIE
3. Po MFA: AUTH.md + WDROZENIE

## Alternatywy (bez rezygnacji z OmniPress)

Supabase Vault / Inngest / MFA Supabase — patrz tabela w pierwotnym audycie; nadal aktualne przed Fazą 4.

## Kolejność prac

1. ~~PRD + audyt~~ ✅
2. ~~Faza 3 kod~~ ✅
3. ~~Docs operacyjne (admin/redaktor/status)~~ ✅
4. **Faza 4** — dispatcher + docs
5. Opcjonalnie: TipTap, passkeys, e-mail
