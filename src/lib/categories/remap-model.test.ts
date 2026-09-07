import { describe, expect, it } from 'vitest';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import {
	applyCategorySlugRemapsToLayout,
	detectCategorySlugRemaps,
} from './remap-model';

function layoutWithOdpady() {
	const layout = emptySiteAstroLayout();
	layout.categories = [{ slug: 'odpady', name: 'Odpady' }];
	layout.slots = [
		{ id: 'home_latest', label: 'Aktualności', component: 'home.latest' },
		{
			id: 'banner_odpady',
			label: 'Baner',
			component: 'sidebar.banner',
			widget: { linkType: 'category', categorySlug: 'odpady' },
		},
	];
	layout.categoryDisplays = { home_latest: ['odpady', 'aktualnosci'] };
	layout.zones = {
		...layout.zones,
		home: { components: [layout.slots[0]!] },
		sidebar: { components: [layout.slots[1]!] },
	};
	return layout;
}

describe('detectCategorySlugRemaps', () => {
	it('łączy 1:1 odpady → gospodarka-odpadami', () => {
		expect(
			detectCategorySlugRemaps(
				[{ slug: 'odpady' }],
				[{ slug: 'gospodarka-odpadami', name: 'Gospodarka odpadami' }],
			),
		).toEqual([{ from: 'odpady', to: 'gospodarka-odpadami', name: 'Gospodarka odpadami' }]);
	});

	it('nie zgaduje przy dwóch nowych i dwóch usuniętych bez par z formularza', () => {
		expect(
			detectCategorySlugRemaps(
				[{ slug: 'a' }, { slug: 'b' }],
				[
					{ slug: 'a2', name: 'A2' },
					{ slug: 'b2', name: 'B2' },
				],
			),
		).toEqual([]);
	});

	it('paruje wiele zmian po category_prev_slug', () => {
		expect(
			detectCategorySlugRemaps(
				[{ slug: 'a' }, { slug: 'b' }],
				[
					{ slug: 'a2', name: 'A2' },
					{ slug: 'b2', name: 'B2' },
				],
				[
					{ prevSlug: 'a', slug: 'a2', name: 'A2' },
					{ prevSlug: 'b', slug: 'b2', name: 'B2' },
				],
			),
		).toEqual([
			{ from: 'a', to: 'a2', name: 'A2' },
			{ from: 'b', to: 'b2', name: 'B2' },
		]);
	});

	it('dodanie kategorii nie jest remapem', () => {
		expect(
			detectCategorySlugRemaps(
				[{ slug: 'aktualnosci' }],
				[
					{ slug: 'aktualnosci', name: 'Aktualności' },
					{ slug: 'nowa', name: 'Nowa' },
				],
			),
		).toEqual([]);
	});
});

describe('applyCategorySlugRemapsToLayout', () => {
	it('przepisuje displays i baner przy remap odpady → gospodarka-odpadami', () => {
		const remaps = [
			{ from: 'odpady', to: 'gospodarka-odpadami', name: 'Gospodarka odpadami' },
		];
		const next = applyCategorySlugRemapsToLayout(layoutWithOdpady(), remaps);
		expect(next.categoryDisplays.home_latest).toEqual(['gospodarka-odpadami', 'aktualnosci']);
		expect(next.slots.find((slot) => slot.id === 'banner_odpady')?.widget?.categorySlug).toBe(
			'gospodarka-odpadami',
		);
		expect(
			next.zones.sidebar.components.find((slot) => slot.id === 'banner_odpady')?.widget
				?.categorySlug,
		).toBe('gospodarka-odpadami');
	});
});
