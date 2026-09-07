import { describe, expect, it } from 'vitest';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import { addCategoryToMenu, addSlugToHomeFeed, findAktualnosciFeedSlotId } from './onboard-model';

function sampleLayout() {
	const layout = emptySiteAstroLayout();
	layout.slots = [
		{ id: 'home_pinned', label: 'Przypięte', component: 'home.pinned' },
		{ id: 'home_latest', label: 'Aktualności', component: 'home.latest' },
	];
	layout.categoryDisplays = { home_pinned: ['aktualnosci'], home_latest: ['aktualnosci'] };
	layout.navigation = [{ label: 'Aktualności', href: '/aktualnosci' }];
	return layout;
}

describe('onboard nowej kategorii', () => {
	it('dopisuje slug do feedu home.latest', () => {
		const layout = sampleLayout();
		expect(findAktualnosciFeedSlotId(layout)).toBe('home_latest');
		const next = addSlugToHomeFeed(layout, 'gospodarka-odpadami');
		expect(next.categoryDisplays.home_latest).toEqual(['aktualnosci', 'gospodarka-odpadami']);
		expect(next.categoryDisplays.home_pinned).toEqual(['aktualnosci']);
	});

	it('dopisuje pozycję menu i nie dubluje', () => {
		const layout = sampleLayout();
		const next = addCategoryToMenu(layout, 'gospodarka-odpadami', 'Gospodarka odpadami');
		expect(next.navigation).toEqual([
			{ label: 'Aktualności', href: '/aktualnosci' },
			{ label: 'Gospodarka odpadami', href: '/gospodarka-odpadami' },
		]);
		expect(addCategoryToMenu(next, 'gospodarka-odpadami', 'Gospodarka odpadami').navigation).toEqual(
			next.navigation,
		);
	});
});
