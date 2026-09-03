import { describe, expect, it } from 'vitest';
import type { NavItem } from './types';
import {
	collectInternalNavHrefs,
	DEAD_TOP_NAV_HREFS,
	reshapeTopNav,
	TOP_NAV_LEVEL1_ORDER,
} from './reshape-top-nav';

const productionLikeNav: NavItem[] = [
	{
		label: 'Gmina',
		children: [
			{ href: '/plan-ogolny-gminy-miedzna', label: 'Plan ogólny Gminy Miedzna' },
			{
				label: 'Jednostki organizacyjne',
				children: [
					{ href: '/gmina/szkolapodstawowa', label: 'Szkoła Podstawowa' },
					{ href: '/gmina/gops', label: 'Gminny Ośrodek Pomocy Społecznej w Miedznie' },
					{ href: '/gmina/przedszkole', label: 'Gminne Przedszkole w Miedznie' },
					{ href: '/gmina/biblioteka', label: 'Gminna Biblioteka Publiczna w Miedznie' },
				],
			},
			{
				label: 'Władze Gminy',
				children: [
					{ href: '/gmina/wojt', label: 'Wójt Gminy' },
					{ href: '/gmina/rada', label: 'Rada Gminy' },
				],
			},
			{
				label: 'Pliki do pobrania',
				children: [{ href: '/gmina/druki', label: 'Wnioski i druki' }],
			},
			{
				label: 'RODO',
				children: [{ href: '/gmina/klauzula-rodo', label: 'Klauzula informacyjna' }],
			},
			{ href: '/gmina/sms', label: 'Powiadomienia SMS' },
		],
		menuColumns: 2,
		menuColumnWidths: ['300px', '300px'],
	},
	{
		label: 'Gospodarka odpadami',
		children: [{ href: '/odpady/pszok', label: 'PSZOK' }],
		menuColumns: 2,
	},
	{ href: '/kontakt', label: 'Kontakt' },
	{ href: 'https://bip.gmina-miedzna.pl', label: 'BIP' },
];

describe('reshapeTopNav', () => {
	const next = reshapeTopNav(productionLikeNav);
	const hrefs = collectInternalNavHrefs(next);

	it('zdejmuje trzy martwe adresy', () => {
		for (const href of DEAD_TOP_NAV_HREFS) {
			expect(hrefs).not.toContain(href);
		}
	});

	it('usuwa pustą grupę Pliki do pobrania', () => {
		const gmina = next.find((item) => item.label === 'Gmina');
		expect(gmina?.children?.some((child) => child.label === 'Pliki do pobrania')).toBe(false);
	});

	it('spłaszcza RODO do liścia Klauzula informacyjna', () => {
		const gmina = next.find((item) => item.label === 'Gmina');
		expect(gmina?.children?.some((child) => child.label === 'RODO')).toBe(false);
		expect(gmina?.children).toEqual(
			expect.arrayContaining([
				{ href: '/gmina/klauzula-rodo', label: 'Klauzula informacyjna' },
			]),
		);
	});

	it('zostawia resztę jednostek i zachowuje mega-menu Gminy', () => {
		const gmina = next.find((item) => item.label === 'Gmina');
		const jednostki = gmina?.children?.find((child) => child.label === 'Jednostki organizacyjne');
		expect(jednostki?.children?.map((child) => child.href)).toEqual([
			'/gmina/szkolapodstawowa',
			'/gmina/przedszkole',
		]);
		expect(gmina?.menuColumns).toBe(2);
		expect(gmina?.menuColumnWidths).toEqual(['300px', '300px']);
	});

	it('nie spłaszcza grupy poziomu 1 z jednym dzieckiem', () => {
		const odpady = next.find((item) => item.label === 'Gospodarka odpadami');
		expect(odpady?.children).toEqual([{ href: '/odpady/pszok', label: 'PSZOK' }]);
	});

	it('dokłada Aktualności i Ochronę ludności oraz ustawia kolejność poziomu 1', () => {
		expect(next.map((item) => item.label)).toEqual([...TOP_NAV_LEVEL1_ORDER]);
		expect(next[0]).toEqual({ href: '/aktualnosci', label: 'Aktualności' });
		expect(next[3]).toEqual({ href: '/ochrona-ludnosci', label: 'Ochrona ludności' });
		expect(hrefs).toEqual(
			expect.arrayContaining(['/aktualnosci', '/ochrona-ludnosci', '/kontakt']),
		);
	});

	it('jest idempotentna', () => {
		expect(reshapeTopNav(next)).toEqual(next);
	});
});
