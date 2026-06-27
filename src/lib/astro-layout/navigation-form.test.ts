import { describe, expect, it } from 'vitest';
import { parseNavigationFromForm, parseLayoutSection } from './parse-form';
import type { SiteAstroLayout } from './types';

function navForm(rows: {
	depth: string;
	label: string;
	kind: string;
	value: string;
	mega?: boolean;
}[]): FormData {
	const form = new FormData();
	for (const row of rows) {
		form.append('nav_depth', row.depth);
		form.append('nav_label', row.label);
		form.append('nav_href_kind', row.kind);
		form.append('nav_href_value', row.value);
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
});
