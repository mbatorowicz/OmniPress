import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import { applyRemapsToPostRow, remapSitePostCategories } from './remap';

const remaps = [{ from: 'odpady', to: 'gospodarka-odpadami', name: 'Gospodarka odpadami' }];

describe('applyRemapsToPostRow', () => {
	it('przepisuje kategorię główną i dodatkową', () => {
		expect(
			applyRemapsToPostRow(
				{
					id: '1',
					category_slug: 'odpady',
					category_name: 'Odpady',
					extra_category_slugs: ['aktualnosci', 'odpady'],
					status: 'published',
				},
				remaps,
			),
		).toEqual({
			id: '1',
			category_slug: 'gospodarka-odpadami',
			category_name: 'Gospodarka odpadami',
			extra_category_slugs: ['aktualnosci', 'gospodarka-odpadami'],
			status: 'published',
		});
	});

	it('nie rusza wpisu spoza remapów', () => {
		expect(
			applyRemapsToPostRow(
				{
					id: '2',
					category_slug: 'aktualnosci',
					category_name: 'Aktualności',
					extra_category_slugs: [],
					status: 'draft',
				},
				remaps,
			),
		).toBeNull();
	});
});

describe('remapSitePostCategories', () => {
	it('aktualizuje trafione wpisy i liczy opublikowane do republikacji', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'posts' && op.steps[0]?.method === 'select') {
				return {
					data: [
						{
							id: 'pub',
							category_slug: 'odpady',
							category_name: 'Odpady',
							extra_category_slugs: [],
							status: 'published',
						},
						{
							id: 'draft',
							category_slug: 'odpady',
							category_name: 'Odpady',
							extra_category_slugs: [],
							status: 'draft',
						},
					],
				};
			}
			return { data: null };
		});

		const result = await remapSitePostCategories(fake.client, 'site-1', remaps);
		expect(result).toEqual({ updated: 2, publishedNeedingRepublish: 1 });
		const updates = fake.calls.filter((op) => op.steps[0]?.method === 'update');
		expect(updates).toHaveLength(2);
		expect(hasEq(updates[0]!, 'id', 'pub')).toBe(true);
		expect(stepArgs(updates[0]!, 'update')?.[0]).toMatchObject({
			category_slug: 'gospodarka-odpadami',
			category_name: 'Gospodarka odpadami',
		});
	});
});
