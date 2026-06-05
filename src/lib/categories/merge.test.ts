import { describe, expect, it } from 'vitest';
import { findCategoryBySlug, mergeCategoryLists } from './merge';

describe('mergeCategoryLists', () => {
	it('łączy listy po slugu', () => {
		const merged = mergeCategoryLists([
			[
				{
					slug: 'aktualnosci',
					name: 'Aktualności',
					sources: ['github_astro'],
				},
			],
			[
				{
					slug: 'aktualnosci',
					name: 'Aktualności',
					sources: ['github_astro'],
				},
			],
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]!.sources).toContain('github_astro');
	});
});

describe('findCategoryBySlug', () => {
	it('znajduje po slugu', () => {
		const found = findCategoryBySlug(
			[{ slug: 'gmina', name: 'Gmina', sources: ['github_astro'] }],
			'gmina',
		);
		expect(found?.name).toBe('Gmina');
	});
});
