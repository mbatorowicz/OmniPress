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

	it('parsuje hideWhenEmpty w slocie', () => {
		const text = JSON.stringify({
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
			slots: [
				{
					id: 'home_pinned',
					label: 'Przypięte',
					component: 'home.pinned',
					widget: { sectionTitle: 'Przypięte', hideWhenEmpty: true },
				},
			],
		});
		const parsed = parseCategoriesFile(text);
		expect(parsed.slots[0]?.widget?.hideWhenEmpty).toBe(true);
	});

	it('parsuje plik kategorii ze slotami', () => {
		const text = JSON.stringify({
			categories: [{ slug: 'pogoda', name: 'Pogoda' }],
			displays: { sidebar_weather: ['pogoda'] },
			slots: [
				{
					id: 'sidebar_weather',
					label: 'Ostrzeżenia',
					component: 'sidebar.weather',
					widget: {
						title: 'Ostrzeżenia',
						limit: 5,
						terytPowiat: '1465',
						mapCenter: { lat: 52, lon: 21 },
						detailsDisplay: 'modal',
						detailsLayout: 'stacked',
						detailsSummary: 'Pełne szczegóły',
						detailsCloseLabel: 'Zamknij',
					},
				},
				{
					id: 'sidebar_recent',
					label: 'Zmiany',
					component: 'sidebar.recent_changes',
					widget: { title: 'Zmiany', limit: 3, order: 10 },
				},
			],
		});
		const parsed = parseCategoriesFile(text);
		const weather = parsed.slots.find((s) => s.component === 'sidebar.weather');
		const recent = parsed.slots.find((s) => s.component === 'sidebar.recent_changes');
		expect(weather?.widget?.terytPowiat).toBe('1465');
		expect(weather?.widget?.detailsDisplay).toBe('modal');
		expect(weather?.widget?.detailsLayout).toBe('stacked');
		expect(weather?.widget?.detailsSummary).toBe('Pełne szczegóły');
		expect(weather?.widget?.detailsCloseLabel).toBe('Zamknij');
		expect(recent?.widget?.limit).toBe(3);
		expect(parsed.displays).toEqual({});
	});

	it('nie dodaje domyślnych kategorii do displays', () => {
		const parsed = parseCategoriesFile('[{"slug":"gmina","name":"Gmina"}]');
		expect(parsed.categories[0].slug).toBe('gmina');
		expect(parsed.displays).toEqual({});
		expect(parsed.slots).toEqual([]);
	});

	it('buduje payloady do GitHub bez widgets/banners', () => {
		const layout: SiteAstroLayout = {
			navigation: [{ label: 'BIP', href: 'https://bip.example.pl' }],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
			categoryDisplays: { home_pinned: ['aktualnosci'] },
			slots: sampleSlots,
			navigationPath: 'src/config/omnipress-navigation.json',
			categoriesPath: 'src/config/omnipress-categories.json',
		};
		expect(buildNavigationFilePayload(layout.navigation)).toContain('"label"');
		const catPayload = buildCategoriesFilePayload(layout);
		expect(catPayload).toContain('"slots"');
		expect(catPayload).not.toContain('"widgets"');
		expect(catPayload).not.toContain('"banners"');
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
		form.append('slot_id', 'home_pinned');
		form.append('slot_label', 'Przypięte');
		form.append('slot_component', 'home.pinned');
		form.set('slot_enabled_home_pinned', 'on');
		form.set('slot_hide_when_empty_home_pinned', 'on');
		form.set('display_home_pinned_pogoda', 'on');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categoryDisplays.home_pinned).toEqual(['pogoda']);
		expect(result.layout.slots[0]?.widget?.hideWhenEmpty).toBe(true);
	});

	it('sortuje banery po order w slotach', () => {
		const form = new FormData();
		form.set('navigation_json', '[{"label":"Kontakt","href":"/kontakt"}]');
		form.append('category_slug', 'pogoda');
		form.append('category_name', 'Pogoda');

		form.append('slot_id', 'b2');
		form.append('slot_label', 'Baner 2');
		form.append('slot_component', 'sidebar.banner');
		form.append('slot_banner_style', 'text');
		form.append('slot_banner_text_title', 'Drugi');
		form.append('slot_banner_link_type', 'external');
		form.append('slot_banner_external_url', 'https://two.example');
		form.append('slot_widget_order', '20');
		form.set('slot_enabled_b2', 'on');

		form.append('slot_id', 'b1');
		form.append('slot_label', 'Baner 1');
		form.append('slot_component', 'sidebar.banner');
		form.append('slot_banner_style', 'text');
		form.append('slot_banner_text_title', 'Pierwszy');
		form.append('slot_banner_link_type', 'external');
		form.append('slot_banner_external_url', 'https://one.example');
		form.append('slot_widget_order', '10');
		form.set('slot_enabled_b1', 'on');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.slots.map((s) => s.id)).toEqual(['b1', 'b2']);
	});

	it('mergeCategoryDisplays nie wypełnia kategorii automatycznie', () => {
		const displays = mergeCategoryDisplays(sampleSlots, { home_pinned: ['x'] });
		expect(displays.home_pinned).toEqual(['x']);
		expect(displays.sidebar_weather).toBeUndefined();
	});

	it('parsuje ustawienia szczegółów pogody z formularza', () => {
		const form = new FormData();
		form.set('navigation_json', '[{"label":"Kontakt","href":"/kontakt"}]');
		form.append('category_slug', 'pogoda');
		form.append('category_name', 'Pogoda');
		form.append('slot_id', 'sidebar_weather');
		form.append('slot_label', 'Ostrzeżenia');
		form.append('slot_component', 'sidebar.weather');
		form.set('slot_enabled_sidebar_weather', 'on');
		form.append('slot_weather_id', 'sidebar_weather');
		form.append('slot_weather_teryt_powiat', '1433');
		form.append('slot_weather_details_display', 'modal');
		form.append('slot_weather_details_layout', 'stacked');
		form.append('slot_weather_details_summary', 'Szczegóły');
		form.append('slot_weather_details_close_label', 'Zamknij okno');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const weather = result.layout.slots.find((s) => s.component === 'sidebar.weather');
		expect(weather?.widget?.detailsDisplay).toBe('modal');
		expect(weather?.widget?.detailsLayout).toBe('stacked');
		expect(weather?.widget?.detailsSummary).toBe('Szczegóły');
		expect(weather?.widget?.detailsCloseLabel).toBe('Zamknij okno');
	});
});
