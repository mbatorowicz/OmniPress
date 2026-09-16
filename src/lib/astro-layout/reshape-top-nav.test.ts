import { describe, expect, it } from 'vitest';
import type { NavItem } from './types';
import { collectInternalNavHrefs, reshapeTopNav } from './reshape-top-nav';

const LEVEL1_LEAVES: NavItem[] = [
	{ href: '/ochrona-ludnosci', label: 'Ochrona ludności' },
];

const LEVEL1_LABELS = [
	'Gmina',
	'Gospodarka odpadami',
	'Ochrona ludności',
	'Kontakt',
	'BIP',
];

const productionLikeNav: NavItem[] = [
	{
		href: '/gmina',
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
				children: [{ href: '/gmina/klauzula-rodo', label: 'RODO' }],
			},
			{ href: '/gmina/sms', label: 'Powiadomienia SMS' },
		],
		menuColumns: 2,
		menuColumnWidths: ['300px', '300px'],
	},
	{
		label: 'Gospodarka odpadami',
		children: [{ href: '/gospodarka-odpadami/pszok', label: 'PSZOK' }],
		menuColumns: 2,
	},
	{ href: '/kontakt', label: 'Kontakt' },
	{ href: 'http://www.bip.gminamiedzna.pl/', label: 'BIP' },
];

describe('reshapeTopNav', () => {
	const next = reshapeTopNav(productionLikeNav, LEVEL1_LEAVES);
	const hrefs = collectInternalNavHrefs(next);

	it('zachowuje GOPS, Bibliotekę i Druki (podejście 18)', () => {
		expect(hrefs).toEqual(
			expect.arrayContaining(['/gmina/gops', '/gmina/biblioteka', '/gmina/druki']),
		);
	});

	it('spłaszcza grupę Pliki do pobrania do liścia Wnioski i druki', () => {
		const gmina = next.find((item) => item.label === 'Gmina');
		expect(gmina?.children?.some((child) => child.label === 'Pliki do pobrania')).toBe(false);
		expect(gmina?.children).toEqual(
			expect.arrayContaining([{ href: '/gmina/druki', label: 'Wnioski i druki' }]),
		);
	});

	it('spłaszcza grupę RODO z jednym dzieckiem do liścia RODO', () => {
		const gmina = next.find((item) => item.label === 'Gmina');
		const rodo = gmina?.children?.find((child) => child.href === '/gmina/klauzula-rodo');
		expect(rodo).toEqual({ href: '/gmina/klauzula-rodo', label: 'RODO' });
		expect(gmina?.children?.some((child) => child.label === 'RODO' && child.children)).toBe(
			false,
		);
	});

	it('zachowuje wszystkie jednostki organizacyjne i mega-menu Gminy', () => {
		const gmina = next.find((item) => item.label === 'Gmina');
		const jednostki = gmina?.children?.find((child) => child.label === 'Jednostki organizacyjne');
		expect(jednostki?.children?.map((child) => child.href)).toEqual([
			'/gmina/szkolapodstawowa',
			'/gmina/gops',
			'/gmina/przedszkole',
			'/gmina/biblioteka',
		]);
		expect(gmina?.menuColumns).toBe(2);
		expect(gmina?.menuColumnWidths).toEqual(['300px', '300px']);
	});

	it('nie spłaszcza grupy poziomu 1 z jednym dzieckiem', () => {
		const odpady = next.find((item) => item.label === 'Gospodarka odpadami');
		expect(odpady?.children).toEqual([{ href: '/gospodarka-odpadami/pszok', label: 'PSZOK' }]);
	});

	it('dokłada Ochronę ludności oraz ustawia kolejność poziomu 1', () => {
		expect(next.map((item) => item.label)).toEqual(LEVEL1_LABELS);
		expect(next[0]?.label).toBe('Gmina');
		expect(next[2]).toEqual({ href: '/ochrona-ludnosci', label: 'Ochrona ludności' });
		expect(hrefs).toEqual(
			expect.arrayContaining(['/ochrona-ludnosci', '/kontakt']),
		);
		expect(hrefs).not.toContain('/aktualnosci');
	});

	it('jest idempotentna', () => {
		expect(reshapeTopNav(next, LEVEL1_LEAVES)).toEqual(next);
		expect(reshapeTopNav(next)).toEqual(next);
	});
});
