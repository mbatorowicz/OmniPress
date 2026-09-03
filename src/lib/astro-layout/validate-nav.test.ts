import { describe, expect, it } from 'vitest';
import type { NavItem } from './types';
import {
	collectNavHrefs,
	isKnownInternalPath,
	validateNavigationLinks,
	type NavLinkRef,
} from './validate-nav';

const sampleNav: NavItem[] = [
	{
		label: 'Gmina',
		children: [
			{ label: 'Plan', href: '/gmina/plan-ogolny' },
			{ label: 'Grupa', children: [{ label: 'Pod', href: '/gmina/pod' }] },
		],
	},
	{ label: 'Kontakt', href: '/kontakt' },
	{ label: 'BIP', href: 'https://bip.example.pl' },
];

describe('validate-nav', () => {
	it('zbiera href z drzewa', () => {
		const refs = collectNavHrefs(sampleNav);
		expect(refs.map((r) => r.href)).toEqual([
			'/gmina/plan-ogolny',
			'/gmina/pod',
			'/kontakt',
			'https://bip.example.pl',
		]);
	});

	it('zgłasza martwe linki wewnętrzne', () => {
		const known = new Set(['/kontakt', '/gmina/plan-ogolny']);
		const issues = validateNavigationLinks(sampleNav, known);
		expect(issues).toHaveLength(1);
		expect(issues[0].href).toBe('/gmina/pod');
	});

	it('ignoruje grupy bez href', () => {
		const nav: NavItem[] = [{ label: 'Menu', children: [{ label: 'X', href: '/x' }] }];
		const issues = validateNavigationLinks(nav, new Set(['/x']));
		expect(issues).toHaveLength(0);
	});

	it('wymaga href u liści bez dzieci', () => {
		const nav: NavItem[] = [{ label: 'Pusta' }];
		const issues = validateNavigationLinks(nav, new Set());
		expect(issues[0].reason).toBe('missing_href');
	});

	it('akceptuje link do wpisu gdy kategoria istnieje', () => {
		const nav: NavItem[] = [{ label: 'Wpis', href: '/aktualnosci/jakis-wpis' }];
		const known = new Set(['/aktualnosci']);
		expect(validateNavigationLinks(nav, known)).toHaveLength(0);
	});

	it('zgłasza link do wpisu z nieistniejącą kategorią', () => {
		const nav: NavItem[] = [
			{ label: 'Martwy', href: '/informacje/aktywizacja-zawodowa-osob-bezrobotnych' },
		];
		const known = new Set(['/aktualnosci', '/kontakt']);
		const issues = validateNavigationLinks(nav, known);
		expect(issues).toHaveLength(1);
		expect(issues[0]?.href).toBe('/informacje/aktywizacja-zawodowa-osob-bezrobotnych');
	});

	it('isKnownInternalPath rozpoznaje prefix kategorii', () => {
		const known = new Set(['/aktualnosci']);
		expect(isKnownInternalPath('/aktualnosci/foo', known)).toBe(true);
		expect(isKnownInternalPath('/informacje/foo', known)).toBe(false);
	});

	it('P0-9: martwa strona w menu jest dead_link, wpis w znanej kategorii nie', () => {
		const nav: NavItem[] = [
			{ label: 'Wójt', href: '/gmina/wojt' },
			{ label: 'GOPS', href: '/gmina/gops' },
			{ label: 'Wpis', href: '/aktualnosci/cokolwiek' },
		];
		const known = new Set([
			'/',
			'/kontakt',
			'/gmina/wojt',
			'/aktualnosci',
			'/ochrona-ludnosci',
		]);
		const issues = validateNavigationLinks(nav, known);
		expect(issues).toEqual([
			expect.objectContaining({ href: '/gmina/gops', reason: 'dead_link' }),
		]);
	});
});

describe('collectNavHrefs labelPath', () => {
	it('buduje ścieżkę etykiet', () => {
		const refs: NavLinkRef[] = collectNavHrefs(sampleNav);
		const plan = refs.find((r) => r.href === '/gmina/plan-ogolny');
		expect(plan?.labelPath).toBe('Gmina → Plan');
	});
});
