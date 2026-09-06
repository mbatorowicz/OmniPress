import { describe, expect, it } from 'vitest';
import { countPostsByStatus, listPostsPage } from './browse';
import { DEFAULT_POSTS_FILTER } from './browse-model';
import { createSupabaseFake, hasEq, opsFor, stepArgs } from '@/lib/testing/supabase-fake';

const SITE = '11111111-2222-3333-4444-555555555555';
const AUTHOR = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function fakeWithRows(rows: unknown[], count: number) {
	return createSupabaseFake(() => ({ data: rows, error: null, count }));
}

describe('listPostsPage', () => {
	it('bez filtra nie zaweza statusu ani strony', async () => {
		const fake = fakeWithRows([], 0);
		await listPostsPage(fake.client, DEFAULT_POSTS_FILTER);

		const op = opsFor(fake, 'posts')[0];
		expect(op.steps.filter((s) => s.method === 'eq')).toHaveLength(0);
		expect(stepArgs(op, 'range')).toEqual([0, 24]);
		expect(stepArgs(op, 'order')).toEqual([
			'scheduled_publish_at',
			{ ascending: false, nullsFirst: false },
		]);
	});

	it('sklada filtry statusu, strony, autora i frazy', async () => {
		const fake = fakeWithRows([], 0);
		await listPostsPage(fake.client, {
			...DEFAULT_POSTS_FILTER,
			status: 'draft',
			siteId: SITE,
			authorId: AUTHOR,
			q: 'festyn',
		});

		const op = opsFor(fake, 'posts')[0];
		expect(hasEq(op, 'status', 'draft')).toBe(true);
		expect(hasEq(op, 'site_id', SITE)).toBe(true);
		expect(hasEq(op, 'author_id', AUTHOR)).toBe(true);
		expect(stepArgs(op, 'ilike')).toEqual(['title', '%festyn%']);
	});

	it('zakres autora z kontekstu wygrywa z filtrem z adresu', async () => {
		const fake = fakeWithRows([], 0);
		await listPostsPage(
			fake.client,
			{ ...DEFAULT_POSTS_FILTER, authorId: AUTHOR },
			{ authorId: 'own-id' },
		);

		const op = opsFor(fake, 'posts')[0];
		expect(hasEq(op, 'author_id', 'own-id')).toBe(true);
		expect(hasEq(op, 'author_id', AUTHOR)).toBe(false);
	});

	it('sortowanie rosnace po tytule z tie-breakiem po id', async () => {
		const fake = fakeWithRows([], 0);
		await listPostsPage(fake.client, { ...DEFAULT_POSTS_FILTER, sort: 'title_asc' });

		const orders = opsFor(fake, 'posts')[0].steps.filter((s) => s.method === 'order');
		expect(orders[0].args).toEqual(['title', { ascending: true }]);
		expect(orders[1].args).toEqual(['id', { ascending: true }]);
	});

	it('druga strona przesuwa zakres i liczy strony', async () => {
		const fake = fakeWithRows([{ id: 'p1' }], 60);
		const page = await listPostsPage(fake.client, { ...DEFAULT_POSTS_FILTER, page: 2 });

		expect(stepArgs(opsFor(fake, 'posts')[0], 'range')).toEqual([25, 49]);
		expect(page).toMatchObject({ total: 60, page: 2, pageCount: 3 });
		expect(page.rows).toHaveLength(1);
	});

	it('brak danych daje puste wiersze i jedna strone', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null }));
		const page = await listPostsPage(fake.client, DEFAULT_POSTS_FILTER);
		expect(page).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
	});
});

describe('countPostsByStatus', () => {
	it('liczy kazdy status osobno', async () => {
		const fake = createSupabaseFake((op) => ({
			data: null,
			error: null,
			count: hasEq(op, 'status', 'draft') ? 4 : 1,
		}));
		const counts = await countPostsByStatus(fake.client);

		expect(counts.draft).toBe(4);
		expect(counts.published).toBe(1);
		expect(opsFor(fake, 'posts')).toHaveLength(6);
	});

	it('zawezenie do autora trafia do kazdego licznika', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null, count: 0 }));
		await countPostsByStatus(fake.client, { authorId: 'own-id' });

		for (const op of opsFor(fake, 'posts')) {
			expect(hasEq(op, 'author_id', 'own-id')).toBe(true);
		}
	});
});
