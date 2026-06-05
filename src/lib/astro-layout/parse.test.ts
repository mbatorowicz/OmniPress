import { describe, expect, it } from 'vitest';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import { mergeCategoryDisplays } from './slots';
import { parseLayoutFromFormData } from './parse-form';
import type { SiteAstroLayout } from './types';

const sampleSlots = [
	{ id: 'home_pinned', label: 'Pinned', component: 'home.pinned' },
	{ id: 'sidebar_weather', label: 'Weather', component: 'sidebar.weather' },
];

describe('astro-layout parse', () => {
	it('parsuje menu jako tablicę JSON', () => {
		const nav = parseNavigationJson('[{"label":"Kontakt","href":"/kontakt"}]');
		expect(nav).toHaveLength(1);
		expect(nav[0].label).toBe('Kontakt');
	});

	it('parsuje plik kategorii ze slotami i widgetami', () => {
		const text = JSON.stringify({
			categories: [{ slug: 'pogoda', name: 'Pogoda' }],
			displays: { sidebar_weather: ['pogoda'] },
			slots: [
				{
					id: 'sidebar_weather',
					label: 'Ostrzeżenia',
					component: 'sidebar.weather',
					widget: { title: 'Ostrzeżenia', limit: 5 },
				},
			],
			widgets: { recent_changes: { title: 'Zmiany', limit: 3 } },
		});
		const parsed = parseCategoriesFile(text);
		expect(parsed.slots[0].id).toBe('sidebar_weather');
		expect(parsed.displays.sidebar_weather).toEqual(['pogoda']);
		expect(parsed.widgets.recent_changes?.limit).toBe(3);
	});

	it('nie dodaje domyślnych kategorii do displays', () => {
		const parsed = parseCategoriesFile('[{"slug":"gmina","name":"Gmina"}]');
		expect(parsed.categories[0].slug).toBe('gmina');
		expect(parsed.displays).toEqual({});
		expect(parsed.slots).toEqual([]);
	});

	it('buduje payloady do GitHub', () => {
		const layout: SiteAstroLayout = {
			navigation: [{ label: 'BIP', href: 'https://bip.example.pl' }],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
			categoryDisplays: { home_pinned: ['aktualnosci'] },
			slots: sampleSlots,
			widgets: {},
			navigationPath: 'src/config/omnipress-navigation.json',
			categoriesPath: 'src/config/omnipress-categories.json',
		};
		expect(buildNavigationFilePayload(layout.navigation)).toContain('"label"');
		expect(buildCategoriesFilePayload(layout)).toContain('"slots"');
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
		form.append('category_slug', 'pogoda');
		form.append('category_name', 'Pogoda');
		form.append('slot_id', 'sidebar_weather');
		form.append('slot_label', 'Ostrzeżenia');
		form.append('slot_component', 'sidebar.weather');
		form.set('slot_enabled_sidebar_weather', 'on');
		form.set('display_sidebar_weather_pogoda', 'on');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categoryDisplays.sidebar_weather).toEqual(['pogoda']);
	});

	it('mergeCategoryDisplays nie wypełnia kategorii automatycznie', () => {
		const displays = mergeCategoryDisplays(sampleSlots, { home_pinned: ['x'] });
		expect(displays.home_pinned).toEqual(['x']);
		expect(displays.sidebar_weather).toEqual([]);
	});
});
