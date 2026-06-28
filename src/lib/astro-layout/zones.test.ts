import { describe, expect, it } from 'vitest';
import {
	emptyZones,
	exportZonesPayload,
	flattenSlots,
	generateComponentInstanceId,
	isLayoutZone,
	mergeZoneComponents,
	migrateFlatSlotsToZones,
	parseZonesFromFile,
} from './zones';
import { mergeLayoutFromFormData } from './parse-form';
import type { DisplaySlot, SiteAstroLayout } from './types';
import { emptySiteAstroLayout } from './types';

const sampleSlots: DisplaySlot[] = [
	{ id: 'home_pinned', label: 'Przypięte', component: 'home.pinned', widget: { order: 10 } },
	{ id: 'home_latest', label: 'Aktualności', component: 'home.latest', widget: { order: 20 } },
	{ id: 'sidebar_weather', label: 'Pogoda', component: 'sidebar.weather', widget: { order: 10 } },
	{ id: 'footer_main', label: 'Stopka', component: 'footer.main', widget: { order: 1 } },
];

describe('zones', () => {
	it('migrateFlatSlotsToZones grupuje sloty po strefie', () => {
		const zones = migrateFlatSlotsToZones(sampleSlots);
		expect(zones.home.components.map((s) => s.id)).toEqual(['home_pinned', 'home_latest']);
		expect(zones.sidebar.components.map((s) => s.id)).toEqual(['sidebar_weather']);
		expect(zones.footer.components.map((s) => s.id)).toEqual(['footer_main']);
		expect(zones.topbar.components).toEqual([]);
	});

	it('flattenSlots odtwarza płaską listę w kolejności stref', () => {
		const zones = migrateFlatSlotsToZones(sampleSlots);
		const flat = flattenSlots(zones);
		expect(flat.map((s) => s.id)).toEqual([
			'home_pinned',
			'home_latest',
			'sidebar_weather',
			'footer_main',
		]);
	});

	it('parseZonesFromFile czyta zones z fallback na slots', () => {
		const zones = migrateFlatSlotsToZones(sampleSlots);
		const parsed = parseZonesFromFile({ zones: exportZonesPayload(zones) });
		expect(parsed.home.components).toHaveLength(2);

		const fromFlat = parseZonesFromFile({}, sampleSlots);
		expect(fromFlat.sidebar.components[0]?.id).toBe('sidebar_weather');
	});

	it('generateComponentInstanceId tworzy stabilne ID', () => {
		const existing: DisplaySlot[] = [{ id: 'sidebar_banner', label: 'B', component: 'sidebar.banner' }];
		expect(generateComponentInstanceId('sidebar', 'sidebar.banner', existing)).toBe('sidebar_banner_2');
		expect(generateComponentInstanceId('sidebar', 'sidebar.banner', [])).toBe('sidebar_banner');
		expect(generateComponentInstanceId('home', 'home.pinned', [])).toBe('home_pinned');
	});

	it('mergeZoneComponents nadpisuje tylko jedną strefę', () => {
		const zones = migrateFlatSlotsToZones(sampleSlots);
		const updated = mergeZoneComponents(zones, 'home', [
			{ id: 'home_pinned', label: 'Nowe przypięte', component: 'home.pinned' },
		]);
		expect(updated.home.components).toHaveLength(1);
		expect(updated.sidebar.components).toHaveLength(1);
	});

	it('isLayoutZone rozpoznaje strefy', () => {
		expect(isLayoutZone('sidebar')).toBe(true);
		expect(isLayoutZone('invalid')).toBe(false);
	});

	it('emptyZones ma wszystkie strefy', () => {
		const zones = emptyZones();
		expect(Object.keys(zones).sort()).toEqual([
			'footer',
			'header',
			'home',
			'sidebar',
			'site',
			'topbar',
		]);
	});

	it('normalizeZonesShape zachowuje komponent w dozwolonej strefie', () => {
		const normalized = parseZonesFromFile({
			zones: {
				site: { components: [] },
				topbar: { components: [] },
				header: { components: [] },
				home: { components: [] },
				sidebar: { components: [] },
				footer: {
					components: [{ id: 'footer_weather', label: 'Pogoda', component: 'sidebar.weather' }],
				},
			},
		});
		expect(normalized.footer.components[0]?.component).toBe('sidebar.weather');
		expect(normalized.sidebar.components).toEqual([]);
	});
});

describe('mergeLayoutFromFormData — layout_zone', () => {
	const existing: SiteAstroLayout = {
		...emptySiteAstroLayout(),
		categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		categoryDisplays: {},
		zones: migrateFlatSlotsToZones([
			{ id: 'home_pinned', label: 'Przypięte', component: 'home.pinned' },
			{ id: 'sidebar_weather', label: 'Pogoda', component: 'sidebar.weather' },
			{ id: 'header_brand', label: 'Logo', component: 'header.brand' },
			{ id: 'header_navigation', label: 'Menu główne', component: 'header.navigation' },
		]),
		slots: [
			{ id: 'home_pinned', label: 'Przypięte', component: 'home.pinned' },
			{ id: 'sidebar_weather', label: 'Pogoda', component: 'sidebar.weather' },
			{ id: 'header_brand', label: 'Logo', component: 'header.brand' },
			{ id: 'header_navigation', label: 'Menu główne', component: 'header.navigation' },
		],
	};

	it('merge per strefa zachowuje komponenty innych stref', () => {
		const form = new FormData();
		form.set('section', 'components');
		form.set('layout_zone', 'home');
		form.append('slot_id', 'home_pinned');
		form.append('slot_label', 'Zmienione przypięte');
		form.append('slot_component', 'home.pinned');
		form.set('slot_enabled_home_pinned', 'on');

		const result = mergeLayoutFromFormData(form, existing, 'components');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.zones.home.components[0]?.label).toBe('Zmienione przypięte');
		expect(result.layout.zones.sidebar.components[0]?.id).toBe('sidebar_weather');
	});

	it('merge w tej samej strefie zachowuje sloty spoza formularza', () => {
		const form = new FormData();
		form.set('section', 'components');
		form.set('layout_zone', 'header');
		form.append('slot_id', 'header_brand');
		form.append('slot_label', 'Logo');
		form.append('slot_component', 'header.brand');
		form.set('slot_enabled_header_brand', 'on');

		const result = mergeLayoutFromFormData(form, existing, 'components');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const headerIds = result.layout.zones.header.components.map((s) => s.id);
		expect(headerIds).toContain('header_brand');
		expect(headerIds).toContain('header_navigation');
	});
});

describe('mergeLayoutFromFormData — layout_mode unit_registry', () => {
	const existing: SiteAstroLayout = {
		...emptySiteAstroLayout(),
		categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		categoryDisplays: {},
		zones: migrateFlatSlotsToZones([
			{ id: 'home_pinned', label: 'Przypięte', component: 'home.pinned' },
			{ id: 'sidebar_weather', label: 'Pogoda', component: 'sidebar.weather' },
			{ id: 'footer_main', label: 'Stopka', component: 'footer.main' },
		]),
		slots: [
			{ id: 'home_pinned', label: 'Przypięte', component: 'home.pinned' },
			{ id: 'sidebar_weather', label: 'Pogoda', component: 'sidebar.weather' },
			{ id: 'footer_main', label: 'Stopka', component: 'footer.main' },
		],
	};

	it('zapisuje wiele stref w jednym POST i zachowuje chrome spoza rejestru', () => {
		const form = new FormData();
		form.set('section', 'components');
		form.set('layout_mode', 'unit_registry');
		form.append('slot_id', 'home_pinned');
		form.append('slot_label', 'Nowe przypięte');
		form.append('slot_component', 'home.pinned');
		form.set('slot_zone_home_pinned', 'home');
		form.set('slot_enabled_home_pinned', 'on');
		form.append('slot_id', 'sidebar_banner');
		form.append('slot_label', 'Baner');
		form.append('slot_component', 'sidebar.banner');
		form.set('slot_zone_sidebar_banner', 'sidebar');
		form.set('slot_banner_link_type__sidebar_banner', 'external');
		form.set('slot_banner_external_url__sidebar_banner', 'https://example.com');
		form.set('slot_banner_style__sidebar_banner', 'text');
		form.set('slot_banner_text_title__sidebar_banner', 'Tytuł');
		form.set('slot_enabled_sidebar_banner', 'on');

		const result = mergeLayoutFromFormData(form, existing, 'components');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.zones.home.components[0]?.label).toBe('Nowe przypięte');
		expect(result.layout.zones.sidebar.components.some((slot) => slot.id === 'sidebar_banner')).toBe(
			true,
		);
		expect(result.layout.zones.footer.components[0]?.component).toBe('footer.main');
		expect(result.layout.zones.sidebar.components.some((slot) => slot.id === 'sidebar_weather')).toBe(
			false,
		);
	});
});
