import { describe, expect, it } from 'vitest';
import { flattenNavigation, eligibleNavParentIndices } from '@/lib/admin/navigation-tree';
import { parseNavigationFromForm, parseLayoutSection } from './parse-form';
import type { SiteAstroLayout } from './types';

function inferParent(depth: string, index: number, rows: { depth: string }[]): string {
	if (depth === '0') return '';
	const target = Number(depth) - 1;
	for (let j = index - 1; j >= 0; j--) {
		if (Number(rows[j]!.depth) === target) return String(j);
	}
	return '';
}

function navForm(
	rows: {
		depth: string;
		label: string;
		kind: string;
		value: string;
		parent?: string;
		mega?: boolean;
	}[],
): FormData {
	const form = new FormData();
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i]!;
		form.append('nav_depth', row.depth);
		form.append('nav_label', row.label);
		form.append('nav_href_kind', row.kind);
		form.append('nav_href_value', row.value);
		form.append('nav_parent', row.parent ?? inferParent(row.depth, i, rows));
		if (row.mega) form.append('nav_is_mega', 'on');
	}
	return form;
}

const existingLayout: SiteAstroLayout = {
	navigation: [{ label: 'Stare', href: '/stare' }],
	categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
	categoryDisplays: { home_feed: ['aktualnosci'] },
	slots: [{ id: 'home_feed', label: 'Feed', component: 'home.feed' }],
	navigationPath: 'src/config/omnipress-navigation.json',
	categoriesPath: 'src/config/omnipress-categories.json',
};

describe('parseNavigationFromForm', () => {
	it('buduje drzewo 3-poziomowe', () => {
		const form = navForm([
			{ depth: '0', label: 'Gmina', kind: 'static', value: '/' },
			{ depth: '1', label: 'Urząd', kind: 'page', value: '/gmina/urzad' },
			{ depth: '2', label: 'Kontakt', kind: 'custom', value: '/kontakt' },
		]);

		const tree = parseNavigationFromForm(form);
		expect(tree).toHaveLength(1);
		expect(tree[0].label).toBe('Gmina');
		expect(tree[0].href).toBe('/');
		expect(tree[0].children).toHaveLength(1);
		expect(tree[0].children![0].label).toBe('Urząd');
		expect(tree[0].children![0].href).toBe('/gmina/urzad');
		expect(tree[0].children![0].children).toHaveLength(1);
		expect(tree[0].children![0].children![0].label).toBe('Kontakt');
		expect(tree[0].children![0].children![0].href).toBe('/kontakt');
	});

	it('przypina pozycję do wskazanej pozycji nadrzędnej', () => {
		const form = navForm([
			{ depth: '0', label: 'A', kind: 'none', value: '' },
			{ depth: '0', label: 'B', kind: 'none', value: '' },
			{ depth: '1', label: 'Pod A', kind: 'custom', value: '/a', parent: '0' },
		]);

		const tree = parseNavigationFromForm(form);
		expect(tree).toHaveLength(2);
		expect(tree[0].children).toHaveLength(1);
		expect(tree[0].children![0].label).toBe('Pod A');
		expect(tree[1].children).toBeUndefined();
	});

	it('odrzuca poziom 1 bez pozycji nadrzędnej', () => {
		const form = navForm([{ depth: '1', label: 'Osierocona', kind: 'custom', value: '/x', parent: '' }]);
		expect(parseNavigationFromForm(form)).toEqual([]);
	});

	it('pomija pusty wiersz bez etykiety', () => {
		const form = navForm([
			{ depth: '0', label: '', kind: 'none', value: '' },
			{ depth: '0', label: 'Start', kind: 'static', value: '/' },
		]);

		const tree = parseNavigationFromForm(form);
		expect(tree).toHaveLength(1);
		expect(tree[0].label).toBe('Start');
	});

	it('ustawia isMegaMenu tylko na poziomie 0', () => {
		const form = navForm([
			{ depth: '0', label: 'Aktualności', kind: 'category', value: 'aktualnosci', mega: true },
			{ depth: '1', label: 'Podmenu', kind: 'custom', value: '/x' },
		]);

		const tree = parseNavigationFromForm(form);
		expect(tree[0].isMegaMenu).toBe(true);
		expect(tree[0].children![0].isMegaMenu).toBeUndefined();
	});

	it('normalizuje slug kategorii do href', () => {
		const form = navForm([{ depth: '0', label: 'News', kind: 'category', value: 'aktualnosci' }]);
		const tree = parseNavigationFromForm(form);
		expect(tree[0].href).toBe('/aktualnosci');
	});
});

describe('parseLayoutSection navigation', () => {
	it('nadpisuje tylko menu, zachowuje kategorie i sloty', () => {
		const form = navForm([{ depth: '0', label: 'Kontakt', kind: 'custom', value: '/kontakt' }]);
		form.set('section', 'navigation');

		const result = parseLayoutSection(form, existingLayout);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.layout.navigation).toEqual([{ label: 'Kontakt', href: '/kontakt' }]);
		expect(result.layout.categories).toEqual(existingLayout.categories);
		expect(result.layout.slots).toEqual(existingLayout.slots);
		expect(result.layout.categoryDisplays).toEqual(existingLayout.categoryDisplays);
	});

	it('używa navigation_json jako fallback', () => {
		const form = new FormData();
		form.set('section', 'navigation');
		form.set('navigation_json', '[{"label":"JSON","href":"/json"}]');

		const result = parseLayoutSection(form, existingLayout);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.navigation[0].label).toBe('JSON');
	});

	it('preferuje tabelę nad navigation_json gdy są wiersze z etykietą', () => {
		const form = navForm([{ depth: '0', label: 'Tabela', kind: 'custom', value: '/tabela' }]);
		form.set('section', 'navigation');
		form.set('navigation_json', '[{"label":"JSON","href":"/json"}]');

		const result = parseLayoutSection(form, existingLayout);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.navigation).toEqual([{ label: 'Tabela', href: '/tabela' }]);
	});

	it('ignoruje pusty pierwszy nav_href_value gdy drugi ma wartość (duplikat pola)', () => {
		const form = new FormData();
		form.append('nav_depth', '0');
		form.append('nav_label', 'News');
		form.append('nav_href_kind', 'category');
		form.append('nav_href_value', '');
		form.append('nav_href_value', 'aktualnosci');
		form.append('nav_parent', '');

		const tree = parseNavigationFromForm(form);
		expect(tree[0].href).toBe('/aktualnosci');
	});

	it('zapisuje kategorię gdy jest jeden nav_href_value na wiersz', () => {
		const form = new FormData();
		form.append('nav_depth', '0');
		form.append('nav_label', 'News');
		form.append('nav_href_kind', 'category');
		form.append('nav_href_value', 'aktualnosci');
		form.append('nav_parent', '');

		const tree = parseNavigationFromForm(form);
		expect(tree[0].href).toBe('/aktualnosci');
	});

	it('round-trip flatten → form → parse zachowuje href liścia menu', () => {
		const nav = [{ label: 'Plan ogólny', href: '/gmina/plan-ogolny' }];
		const pageOptions = [{ path: '/gmina/plan-ogolny', title: 'Plan ogólny' }];
		const rows = flattenNavigation(nav, existingLayout.categories, pageOptions);
		const form = navForm(
			rows.map((r, i) => ({
				depth: String(r.depth),
				label: r.label,
				kind: r.hrefKind,
				value: r.hrefValue,
				parent: r.parentRowIndex !== null ? String(r.parentRowIndex) : '',
			})),
		);
		const tree = parseNavigationFromForm(form);
		expect(tree[0].href).toBe('/gmina/plan-ogolny');
	});

	it('preferuje navigation_json tylko gdy tabela nie ma linkow', () => {
		const form = navForm([{ depth: '0', label: 'Uszkodzone', kind: 'none', value: '' }]);
		form.set('section', 'navigation');
		form.set(
			'navigation_json',
			'[{"label":"Plan","href":"/gmina/plan-ogolny"}]',
		);

		const result = parseLayoutSection(form, existingLayout);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.navigation[0]?.href).toBe('/gmina/plan-ogolny');
	});

	it('zapisuje zmiane typu linku w tabeli mimo obecnego navigation_json', () => {
		const form = navForm([
			{ depth: '0', label: 'Gmina', kind: 'none', value: '' },
			{ depth: '1', label: 'Zarządzenia', kind: 'category', value: 'zarzadzenia', parent: '0' },
		]);
		form.set('section', 'navigation');
		form.set(
			'navigation_json',
			'[{"label":"Gmina","children":[{"label":"Zarządzenia","href":"/gmina/zarzadzenia"}]}]',
		);

		const result = parseLayoutSection(form, existingLayout);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.navigation[0]?.children?.[0]?.href).toBe('/zarzadzenia');
	});

	it('round-trip pełniejszego drzewa gminy zachowuje hrefy liści', () => {
		const nav = [
			{
				label: 'Gmina',
				children: [
					{ label: 'Plan ogólny Gminy Miedzna', href: '/gmina/plan-ogolny' },
					{
						label: 'Jednostki organizacyjne',
						children: [
							{
								label: 'Szkoła Podstawowa',
								href: '/gmina/szkolapodstawowa',
							},
						],
					},
					{ label: 'Zarządzenia', href: '/gmina/zarzadzenia' },
				],
			},
			{ label: 'Kontakt', href: '/kontakt' },
		];
		const pageOptions = [
			{ path: '/gmina/plan-ogolny', title: 'Plan ogólny' },
			{ path: '/gmina/szkolapodstawowa', title: 'Szkoła' },
			{ path: '/gmina/zarzadzenia', title: 'Zarządzenia' },
		];
		const rows = flattenNavigation(nav, existingLayout.categories, pageOptions);
		const form = navForm(
			rows.map((r) => ({
				depth: String(r.depth),
				label: r.label,
				kind: r.hrefKind,
				value: r.hrefValue,
				parent: r.parentRowIndex !== null ? String(r.parentRowIndex) : '',
			})),
		);
		const tree = parseNavigationFromForm(form);
		const hrefs = tree.flatMap(function collect(item: (typeof tree)[number]): string[] {
			const out = item.href ? [item.href] : [];
			for (const child of item.children ?? []) out.push(...collect(child));
			return out;
		});
		expect(hrefs).toContain('/gmina/plan-ogolny');
		expect(hrefs).toContain('/gmina/szkolapodstawowa');
		expect(hrefs).toContain('/gmina/zarzadzenia');
		expect(hrefs).toContain('/kontakt');
	});
});

describe('eligibleNavParentIndices', () => {
	it('zwraca tylko wcześniejsze wiersze o poziomie depth-1', () => {
		const rows = [
			{ label: 'A', depth: 0 },
			{ label: 'B', depth: 0 },
			{ label: 'C', depth: 1 },
		];
		expect(eligibleNavParentIndices(rows, 2, 1)).toEqual([0, 1]);
	});
});
