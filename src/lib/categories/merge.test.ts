import { describe, expect, it } from 'vitest';
import { findCategoryBySlug, mergeCategoryLists } from './merge';

describe('mergeCategoryLists', () => {
	it('łączy WP i Astro po slugu', () => {
		const merged = mergeCategoryLists([
			[
				{
					slug: 'aktualnosci',
					name: 'Aktualności',
					wpCategoryId: 5,
					sources: ['wordpress'],
				},
			],
			[
				{
					slug: 'aktualnosci',
					name: 'Aktualności',
					wpCategoryId: null,
					sources: ['github_astro'],
				},
			],
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0].wpCategoryId).toBe(5);
		expect(merged[0].sources).toContain('github_astro');
	});
});

describe('findCategoryBySlug', () => {
	it('znajduje po slugu', () => {
		const found = findCategoryBySlug(
			[{ slug: 'gmina', name: 'Gmina', wpCategoryId: null, sources: ['github_astro'] }],
			'gmina',
		);
		expect(found?.name).toBe('Gmina');
	});
});
