import { describe, expect, it } from 'vitest';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import { mergeCategoryDisplays } from './slots';
import { parseLayoutFromFormData, mergeLayoutFromFormData } from './parse-form';
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

	it('parsuje menuColumns i menuColumnWidths na poziomie root', () => {
		const nav = parseNavigationJson(
			'[{"label":"Gmina","menuColumns":2,"menuColumnWidths":["320px","320px"],"children":[{"label":"Plan","href":"/plan"}]}]',
		);
		expect(nav[0]?.menuColumns).toBe(2);
		expect(nav[0]?.menuColumnWidths).toEqual(['320px', '320px']);
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

	it('parsuje archiveLayout i archiveColumns w pliku kategorii', () => {
		const parsed = parseCategoriesFile(
			JSON.stringify({
				categories: [
					{ slug: 'aktualnosci', name: 'Aktualności' },
					{ slug: 'zarządzenia', name: 'Zarządzenia', archiveLayout: 'title-list' },
					{ slug: 'informacje', name: 'Informacje', archiveColumns: 1 },
				],
				displays: {},
				slots: [],
			}),
		);
		expect(parsed.categories[1]?.archiveLayout).toBe('title-list');
		expect(parsed.categories[2]?.archiveColumns).toBe(1);
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
		form.set('slot_home_feed_section_title__home_pinned', 'Przypięte');
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
		form.append('slot_banner_style__b2', 'text');
		form.append('slot_banner_text_title__b2', 'Drugi');
		form.append('slot_banner_link_type__b2', 'external');
		form.append('slot_banner_external_url__b2', 'https://two.example');
		form.append('slot_widget_order', '20');
		form.set('slot_enabled_b2', 'on');

		form.append('slot_id', 'b1');
		form.append('slot_label', 'Baner 1');
		form.append('slot_component', 'sidebar.banner');
		form.append('slot_banner_style__b1', 'text');
		form.append('slot_banner_text_title__b1', 'Pierwszy');
		form.append('slot_banner_link_type__b1', 'external');
		form.append('slot_banner_external_url__b1', 'https://one.example');
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
		form.append('slot_weather_teryt_powiat__sidebar_weather', '1433');
		form.append('slot_weather_details_display__sidebar_weather', 'modal');
		form.append('slot_weather_details_layout__sidebar_weather', 'stacked');
		form.append('slot_weather_details_summary__sidebar_weather', 'Szczegóły');
		form.append('slot_weather_details_close_label__sidebar_weather', 'Zamknij okno');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const weather = result.layout.slots.find((s) => s.component === 'sidebar.weather');
		expect(weather?.widget?.detailsDisplay).toBe('modal');
		expect(weather?.widget?.detailsLayout).toBe('stacked');
		expect(weather?.widget?.detailsSummary).toBe('Szczegóły');
		expect(weather?.widget?.detailsCloseLabel).toBe('Zamknij okno');
	});

	it('parsuje archiveLayout i archiveColumns z formularza kategorii', () => {
		const form = new FormData();
		form.set('navigation_json', '[{"label":"Kontakt","href":"/kontakt"}]');
		form.append('category_slug', 'aktualnosci');
		form.append('category_name', 'Aktualności');
		form.append('category_archive_layout', 'tiles');
		form.append('category_archive_columns', '2');
		form.append('category_slug', 'zarządzenia');
		form.append('category_name', 'Zarządzenia');
		form.append('category_archive_layout', 'title-list');
		form.append('category_archive_columns', '2');
		form.append('slot_id', 'home_pinned');
		form.append('slot_label', 'Przypięte');
		form.append('slot_component', 'home.pinned');
		form.set('slot_enabled_home_pinned', 'on');

		const result = parseLayoutFromFormData(form, base);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categories[0]?.archiveLayout).toBeUndefined();
		expect(result.layout.categories[1]?.archiveLayout).toBe('title-list');
		expect(result.layout.categories[1]?.archiveColumns).toBeUndefined();
	});
});

describe('mergeLayoutFromFormData', () => {
	const existing: SiteAstroLayout = {
		navigation: [],
		categories: [
			{ slug: 'aktualnosci', name: 'Aktualności' },
			{ slug: 'odpady', name: 'Odpady' },
		],
		categoryDisplays: { home_latest: ['aktualnosci'] },
		slots: [
			{ id: 'home_latest', label: 'Aktualności', component: 'home.latest', widget: { enabled: true } },
		],
		navigationPath: 'src/config/omnipress-navigation.json',
		categoriesPath: 'src/config/omnipress-categories.json',
	};

	it('parsuje categoryDisplays przy zapisie sekcji components', () => {
		const form = new FormData();
		form.append('slot_id', 'home_latest');
		form.append('slot_label', 'Aktualności');
		form.append('slot_component', 'home.latest');
		form.set('slot_enabled_home_latest', 'on');
		form.set('display_home_latest_aktualnosci', 'on');
		form.set('display_home_latest_odpady', 'on');

		const result = mergeLayoutFromFormData(form, existing, 'components');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categoryDisplays.home_latest).toEqual(['aktualnosci', 'odpady']);
	});

	it('zachowuje categoryDisplays przy zapisie sekcji categories bez macierzy', () => {
		const form = new FormData();
		form.append('category_slug', 'aktualnosci');
		form.append('category_name', 'Aktualności');

		const result = mergeLayoutFromFormData(form, existing, 'categories');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categoryDisplays.home_latest).toEqual(['aktualnosci']);
	});
});
