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

	it('dopisuje pozycję do Gminy, a bez Gminy na poziom 1', () => {
		const layout = sampleLayout();
		const asTop = addCategoryToMenu(layout, 'gospodarka-odpadami', 'Gospodarka odpadami');
		expect(asTop.navigation).toEqual([
			{ label: 'Aktualności', href: '/aktualnosci' },
			{ label: 'Gospodarka odpadami', href: '/gospodarka-odpadami' },
		]);
		layout.navigation = [
			{ href: '/gmina', label: 'Gmina', children: [{ href: '/inwestycje', label: 'Inwestycje' }] },
		];
		const next = addCategoryToMenu(layout, 'mazowsze-bez-smogu', 'Mazowsze bez smogu');
		expect(next.navigation[0]?.children).toEqual([
			{ href: '/inwestycje', label: 'Inwestycje' },
			{ href: '/mazowsze-bez-smogu', label: 'Mazowsze bez smogu' },
		]);
		expect(addCategoryToMenu(next, 'mazowsze-bez-smogu', 'Mazowsze bez smogu').navigation).toEqual(
			next.navigation,
		);
	});
});
