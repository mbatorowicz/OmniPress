import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq, opsFor } from '@/lib/testing/supabase-fake';
import { matchReplaceTarget } from './match-replace-target';

const SITE = '11111111-1111-4111-8111-111111111111';
const POST = '22222222-2222-4222-8222-222222222222';

describe('matchReplaceTarget', () => {
	it('trafia po URL wpisu /kategoria/slug', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts') {
				return { data: { id: POST, site_id: SITE, title: 'Festyn gminny' } };
			}
			if (op.table === 'site_pages') return { data: null };
			return { data: null };
		});
		const match = await matchReplaceTarget(
			fake.client,
			'gmina-miedzna',
			'https://gmina-miedzna.pl/aktualnosci/festyn-gminny',
		);
		expect(match.status).toBe('exact');
		if (match.status === 'exact') {
			expect(match.candidate).toMatchObject({ kind: 'post', id: POST, title: 'Festyn gminny' });
		}
		expect(hasEq(opsFor(fake, 'posts')[0]!, 'slug', 'festyn-gminny')).toBe(true);
		expect(hasEq(opsFor(fake, 'posts')[0]!, 'category_slug', 'aktualnosci')).toBe(true);
	});

	it('dwuznaczny tytuł → ambiguous, zero zgadywania', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && op.steps.some((s) => s.method === 'maybeSingle')) {
				return { data: null };
			}
			if (op.table === 'posts') {
				return {
					data: [
						{ id: POST, site_id: SITE, title: 'Festyn 2025' },
						{ id: '33333333-3333-4333-8333-333333333333', site_id: SITE, title: 'Festyn 2026' },
					],
				};
			}
			if (op.table === 'site_pages') return { data: [] };
			if (op.table === 'assets') return { data: [] };
			return { data: null };
		});
		const match = await matchReplaceTarget(fake.client, 'gmina-miedzna', 'Festyn 20');
		expect(match.status).toBe('ambiguous');
	});
});
