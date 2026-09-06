import { describe, expect, it } from 'vitest';
import { mergeDraftCategoriesOntoLive } from './category-merge';
import { emptySiteAstroLayout } from './types';

describe('mergeDraftCategoriesOntoLive', () => {
	it('bierze kategorie ze szkicu, a menu ze strony live', () => {
		const live = emptySiteAstroLayout();
		live.navigation = [{ label: 'Aktualności', href: '/aktualnosci' }];
		live.categories = [{ slug: 'aktualnosci', name: 'Aktualności' }];
		live.slots = [{ id: 'home_latest', label: 'Aktualności', component: 'home.latest' }];
		live.categoryDisplays = { home_latest: ['aktualnosci', 'stara'] };

		const draft = emptySiteAstroLayout();
		draft.navigation = [];
		draft.categories = [
			{ slug: 'aktualnosci', name: 'Aktualności' },
			{ slug: 'mazowsze-bez-smogu', name: 'Mazowsze bez smogu' },
		];

		const merged = mergeDraftCategoriesOntoLive(live, draft);
		expect(merged.navigation).toEqual(live.navigation);
		expect(merged.categories.map((c) => c.slug)).toEqual(['aktualnosci', 'mazowsze-bez-smogu']);
		expect(merged.categoryDisplays.home_latest).toEqual(['aktualnosci']);
	});
});
