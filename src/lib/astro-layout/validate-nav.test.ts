import { describe, expect, it } from 'vitest';
import type { NavItem } from './types';
import {
	collectNavHrefs,
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
});

describe('collectNavHrefs labelPath', () => {
	it('buduje ścieżkę etykiet', () => {
		const refs: NavLinkRef[] = collectNavHrefs(sampleNav);
		const plan = refs.find((r) => r.href === '/gmina/plan-ogolny');
		expect(plan?.labelPath).toBe('Gmina → Plan');
	});
});
