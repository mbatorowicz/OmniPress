import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { flattenNavigation, collectNavInternalPageOptions, computeNavRowOrder } from './navigation-tree';
import { parseNavigationJson } from '@/lib/astro-layout/parse';
import { mergePageOptionsForNavEditor } from './link-options';

const gminaNavPath = join(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../gmina-miedzna.pl/src/config/omnipress-navigation.json',
);

describe('flattenNavigation', () => {
	it('mapuje hrefy z pliku gminy na typy page/custom (nie none)', () => {
		let navText: string;
		try {
			navText = readFileSync(gminaNavPath, 'utf8');
		} catch {
			return; // brak lokalnego repo Astro w CI
		}

		const nav = parseNavigationJson(navText);
		const publishedPages = [
			{ path: '/gmina/plan-ogolny', title: 'Plan ogólny' },
			{ path: '/kontakt', title: 'Kontakt' },
		];
		const pageOptions = mergePageOptionsForNavEditor(
			publishedPages,
			collectNavInternalPageOptions(nav),
		);

		const rows = flattenNavigation(nav, [{ slug: 'aktualnosci', name: 'Aktualności' }], pageOptions);
		const plan = rows.find((r) => r.label.includes('Plan ogólny'));
		expect(plan?.hrefKind).toBe('page');
		expect(plan?.hrefValue).toBe('/gmina/plan-ogolny');

		const withHref = rows.filter((r) => r.hrefKind !== 'none');
		expect(withHref.length).toBeGreaterThan(10);
	});

	it('pokazuje none tylko dla pozycji bez href (same rozwijane)', () => {
		const nav = parseNavigationJson(
			'[{"label":"Gmina","children":[{"label":"Podmenu","children":[{"label":"Leaf","href":"/x"}]}]}]',
		);
		const rows = flattenNavigation(nav, [], []);
		expect(rows.map((r) => r.hrefKind)).toEqual(['none', 'none', 'custom']);
	});

	it('ustawia parentRowIndex dla poziomów > 0', () => {
		const nav = parseNavigationJson(
			'[{"label":"Gmina","children":[{"label":"Podmenu","href":"/x"}]}]',
		);
		const rows = flattenNavigation(nav, [], []);
		expect(rows[0]?.parentRowIndex).toBeNull();
		expect(rows[1]?.parentRowIndex).toBe(0);
	});
});

describe('computeNavRowOrder', () => {
	it('sortuje wiersze w kolejności DFS wg parentRowIndex', () => {
		const rows = [
			{ depth: 0, parentRowIndex: null },
			{ depth: 1, parentRowIndex: 0 },
			{ depth: 0, parentRowIndex: null },
			{ depth: 1, parentRowIndex: 2 },
		];
		expect(computeNavRowOrder(rows)).toEqual([0, 1, 2, 3]);
	});

	it('przenosi dziecko pod rodzica po zmianie parentRowIndex', () => {
		const rows = [
			{ depth: 0, parentRowIndex: null },
			{ depth: 0, parentRowIndex: null },
			{ depth: 1, parentRowIndex: 0 },
		];
		expect(computeNavRowOrder(rows)).toEqual([0, 2, 1]);
	});
});
