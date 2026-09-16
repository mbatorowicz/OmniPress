import { describe, expect, it } from 'vitest';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import {
	appendUnlistedCategoriesToGmina,
	ensureUnlistedCategoriesInGmina,
	unlistedCategories,
} from './gmina-menu';

const categories = [
	{ slug: 'gmina', name: 'Gmina' },
	{ slug: 'gospodarka-odpadami', name: 'Gospodarka odpadami' },
	{ slug: 'mazowsze-bez-smogu', name: 'Mazowsze bez smogu' },
	{
		slug: 'dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog',
		name: 'Dofinansowano ze środków Rządowego Funduszu Rozwoju Dróg',
	},
	{ slug: 'panstwowy-fundusz-celowy', name: 'Państwowy Fundusz Celowy' },
];

const nav = [
	{
		href: '/gmina',
		label: 'Gmina',
		children: [{ href: '/inwestycje', label: 'Inwestycje' }],
	},
	{ href: '/gospodarka-odpadami', label: 'Gospodarka odpadami' },
];

describe('kategorie spoza menu → Gmina', () => {
	it('wskazuje tylko archiwa, których nie ma w całym menu', () => {
		expect(unlistedCategories(nav, categories).map((item) => item.slug)).toEqual([
			'mazowsze-bez-smogu',
			'dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog',
			'panstwowy-fundusz-celowy',
		]);
	});

	it('dopisuje brakujące do zakładki Gmina i nie dubluje', () => {
		const next = appendUnlistedCategoriesToGmina(nav, categories);
		expect(next[0]?.children?.map((item) => item.href)).toEqual([
			'/inwestycje',
			'/mazowsze-bez-smogu',
			'/dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog',
			'/panstwowy-fundusz-celowy',
		]);
		expect(appendUnlistedCategoriesToGmina(next, categories)).toEqual(next);
	});

	it('bez zakładki Gmina dokłada liście na poziomie 1', () => {
		const next = appendUnlistedCategoriesToGmina(
			[{ href: '/kontakt', label: 'Kontakt' }],
			[{ slug: 'inwestycje', name: 'Inwestycje' }],
		);
		expect(next).toEqual([
			{ href: '/kontakt', label: 'Kontakt' },
			{ href: '/inwestycje', label: 'Inwestycje' },
		]);
	});

	it('synchronizuje layout', () => {
		const layout = emptySiteAstroLayout();
		layout.categories = categories;
		layout.navigation = nav;
		const next = ensureUnlistedCategoriesInGmina(layout);
		expect(next.navigation[0]?.children?.at(-1)?.href).toBe('/panstwowy-fundusz-celowy');
	});
});
