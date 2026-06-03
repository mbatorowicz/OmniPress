import { describe, expect, it } from 'vitest';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import { defaultCategoryDisplays } from './slots';
import { parseLayoutFromFormData } from './parse-form';
import type { SiteAstroLayout } from './types';

describe('astro-layout parse', () => {
	it('parsuje menu jako tablicę JSON', () => {
		const nav = parseNavigationJson('[{"label":"Kontakt","href":"/kontakt"}]');
		expect(nav).toHaveLength(1);
		expect(nav[0].label).toBe('Kontakt');
	});

	it('parsuje plik kategorii z displays', () => {
		const text = JSON.stringify({
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
			displays: { home_pinned: ['aktualnosci'], home_latest: [], sidebar_feed: [] },
		});
		const parsed = parseCategoriesFile(text);
		expect(parsed.categories[0].slug).toBe('aktualnosci');
		expect(parsed.displays.home_pinned).toEqual(['aktualnosci']);
	});

	it('zachowuje kompatybilność z tablicą kategorii', () => {
		const parsed = parseCategoriesFile('[{"slug":"gmina","name":"Gmina"}]');
		expect(parsed.categories[0].slug).toBe('gmina');
		expect(parsed.displays).toEqual(defaultCategoryDisplays());
	});

	it('buduje payloady do GitHub', () => {
		const layout: SiteAstroLayout = {
			navigation: [{ label: 'BIP', href: 'https://bip.example.pl' }],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
			categoryDisplays: defaultCategoryDisplays(),
			navigationPath: 'src/config/omnipress-navigation.json',
			categoriesPath: 'src/config/omnipress-categories.json',
		};
		expect(buildNavigationFilePayload(layout.navigation)).toContain('"label"');
		expect(buildCategoriesFilePayload(layout)).toContain('"displays"');
	});
});

describe('parseLayoutFromFormData', () => {
	const base = {
		navigationPath: 'src/config/omnipress-navigation.json',
		categoriesPath: 'src/config/omnipress-categories.json',
	};

	it('składa layout z pól formularza', () => {
		const form = new FormData();
		form.set('navigation_json', '[{"label":"Kontakt","href":"/kontakt"}]');
		form.append('category_slug', 'aktualnosci');
		form.append('category_name', 'Aktualności');
		form.set('display_home_pinned_aktualnosci', 'on');
		form.set('display_home_latest_aktualnosci', 'on');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categoryDisplays.home_pinned).toEqual(['aktualnosci']);
	});
});
