import { describe, expect, it } from 'vitest';
import { LAYOUT_COMPONENT_IDS } from './components';
import { buildLayoutFilePayload } from './parse';
import {
	assertLayoutComponentIds,
	assertLayoutFileContract,
	layoutFileSchema,
	parseLayoutFilePayload,
} from './layout-file-schema';
import type { SiteAstroLayout } from './types';
import { emptySiteAstroLayout } from './types';

function sampleLayout(): SiteAstroLayout {
	const base = emptySiteAstroLayout();
	return {
		...base,
		categories: [
			{ slug: 'aktualnosci', name: 'Aktualności' },
			{ slug: 'informacje', name: 'Informacje', archiveLayout: 'title-list' },
		],
		categoryDisplays: {
			home_pinned: ['aktualnosci'],
			home_latest: ['aktualnosci', 'informacje'],
			sidebar_weather: ['informacje'],
		},
		slots: [
			{
				id: 'site_meta',
				label: 'Meta',
				component: 'site.meta',
				widget: { name: 'Gmina Miedzna', description: 'Portal', url: 'https://gmina-miedzna.pl' },
			},
			{
				id: 'header_nav',
				label: 'Menu',
				component: 'header.navigation',
				widget: {
					navigation: [{ label: 'Kontakt', href: '/kontakt' }],
				},
			},
			{
				id: 'home_pinned',
				label: 'Przypięte',
				component: 'home.pinned',
				widget: { sectionTitle: 'Przypięte', hideWhenEmpty: true },
			},
			{
				id: 'sidebar_weather',
				label: 'Pogoda',
				component: 'sidebar.weather',
				widget: { terytPowiat: '1465', terytGmina: '1433062' },
			},
			{
				id: 'sidebar_recent',
				label: 'Zmiany',
				component: 'sidebar.recent_changes',
				entries: [
					{
						title: 'Nowy wpis',
						href: '/aktualnosci/test',
						kind: 'news',
						changedAt: '2026-08-27T10:00:00.000Z',
					},
				],
			},
		],
	};
}

describe('layout file contract', () => {
	it('buildLayoutFilePayload spełnia schemat JSON', () => {
		const json = buildLayoutFilePayload(sampleLayout());
		expect(() => assertLayoutFileContract(json)).not.toThrow();
	});

	it('payload zawiera zones, nie slots ani weather', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		expect(payload.zones).toBeDefined();
		expect(Object.keys(payload)).toEqual(['categories', 'displays', 'zones']);
	});

	it('każdy component w payloadzie należy do LAYOUT_COMPONENT_IDS', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		assertLayoutComponentIds(payload);
		const seen = new Set<string>();
		for (const zone of Object.values(payload.zones)) {
			for (const slot of zone.components) {
				seen.add(slot.component);
			}
		}
		for (const id of seen) {
			expect(LAYOUT_COMPONENT_IDS).toContain(id);
		}
	});

	it('odrzuca nieznany component (regresja kontraktu)', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		payload.zones.home.components.push({
			id: 'fake',
			label: 'Fake',
			component: 'home.unknown_widget',
		});
		expect(() => assertLayoutComponentIds(payload)).toThrow(/Nieznany component/);
	});

	it('odrzuca root slots (legacy) — schemat strict', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		const withLegacy = { ...payload, slots: [] };
		expect(() => layoutFileSchema.parse(withLegacy)).toThrow();
	});

	it('odrzuca root weather (legacy) — schemat strict', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		const withLegacy = { ...payload, weather: { terytCodes: ['1465'] } };
		expect(() => layoutFileSchema.parse(withLegacy)).toThrow();
	});

	it('akceptuje slug zarzadzenia (regresja)', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		payload.categories = [{ slug: 'zarzadzenia', name: 'Zarządzenia' }];
		expect(() => layoutFileSchema.parse(payload)).not.toThrow();
	});

	it('odrzuca slug kategorii poza regexem Astro', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		payload.categories = [{ slug: '!!', name: 'Złe' }];
		expect(() => layoutFileSchema.parse(payload)).toThrow();
		payload.categories = [{ slug: 'zarządzenia', name: 'Zarządzenia' }];
		expect(() => layoutFileSchema.parse(payload)).toThrow();
	});

	it('odrzuca duplikat slugu kategorii (case-insensitive)', () => {
		const payload = parseLayoutFilePayload(buildLayoutFilePayload(sampleLayout()));
		payload.categories = [
			{ slug: 'zarzadzenia', name: 'A' },
			{ slug: 'zarzadzenia', name: 'B' },
		];
		expect(() => layoutFileSchema.parse(payload)).toThrow(/duplikat slugu/);
	});

	it('assertLayoutFileContract blokuje publikację z niepoprawnym slugiem', () => {
		const layout = sampleLayout();
		layout.categories = [
			{ slug: 'zarządzenia', name: 'A' },
			{ slug: 'zarzadzenia', name: 'B' },
		];
		expect(() => assertLayoutFileContract(buildLayoutFilePayload(layout))).toThrow();
	});
});
