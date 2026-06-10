import { describe, expect, it } from 'vitest';
import { findWeatherSlot } from './filter';
import { buildTerytLevels, normalizeOsmetTeryt } from './normalize';
import sample from './fixtures/osmet-teryt.sample.json';
import type { OsmetTerytResponse } from './types';

const raw = sample as OsmetTerytResponse;

const miedznaConfig = {
	terytPowiat: '1433',
	mapCenter: { lat: 52.4702, lon: 22.0919 },
	mapZoom: 11,
	mapScopePowiaty: ['1434'],
};

describe('normalizeOsmetTeryt', () => {
	it('returns active warnings for local powiat', () => {
		const file = normalizeOsmetTeryt(
			raw,
			miedznaConfig,
			new Date('2026-06-09T17:00:00+02:00'),
		);
		expect(file.active).toHaveLength(1);
		expect(file.active[0].level).toBe(1);
		expect(file.active[0].phenomenon).toBe('Burze');
		expect(file.active[0].affectsLocalPowiat).toBe(true);
		expect(file.active[0].affectedPowiaty.some((p) => p.code === '1433')).toBe(true);
		expect(file.active[0].affectedPowiaty[0].name).toBe('powiat węgrowski');
		expect(file.updatedAt).toBe('2026-06-09T18:33:59+02:00');
	});

	it('builds terytLevels and mapHighlight from active warning powiaty', () => {
		const file = normalizeOsmetTeryt(
			raw,
			miedznaConfig,
			new Date('2026-06-09T17:00:00+02:00'),
		);
		expect(file.terytLevels).toEqual({ '1433': 1, '1434': 1 });
		expect(file.mapHighlight).toEqual(['1433', '1434']);
		expect(file.mapScope).toEqual(['1433', '1434']);
	});

	it('includes optional neighbor in mapScope but not in terytLevels without warning', () => {
		const file = normalizeOsmetTeryt(
			raw,
			{ ...miedznaConfig, mapScopePowiaty: ['1412'] },
			new Date('2026-06-09T17:00:00+02:00'),
		);
		expect(file.mapHighlight).toEqual(['1433', '1434']);
		expect(file.mapScope).toEqual(['1412', '1433', '1434']);
		expect(file.terytLevels['1412']).toBeUndefined();
	});

	it('drops expired warnings', () => {
		const file = normalizeOsmetTeryt(raw, miedznaConfig, new Date('2026-06-10T00:00:00+02:00'));
		expect(file.active).toHaveLength(0);
	});
});

describe('buildTerytLevels', () => {
	it('uses highest level when multiple active warning ids', () => {
		const teryt = { '1213': ['Sk20260609034330686', 'Sk20260609034355961'] };
		const activeIds = new Set(['Sk20260609034330686', 'Sk20260609034355961']);
		const levels = buildTerytLevels(teryt, raw.warnings, ['1213'], activeIds);
		expect(levels['1213']).toBe(2);
	});

	it('ignores warnings not in active set', () => {
		const teryt = { '1213': ['Sk20260609034330686', 'Sk20260609034355961'] };
		const activeIds = new Set(['Sk20260609034355961']);
		const levels = buildTerytLevels(teryt, raw.warnings, ['1213'], activeIds);
		expect(levels['1213']).toBe(1);
	});
});

describe('findWeatherSlot', () => {
	it('finds enabled sidebar.weather with terytPowiat', () => {
		const config = findWeatherSlot({
			navigation: [],
			categoryDisplays: {},
			categories: [],
			slots: [
				{
					id: 'sidebar_weather',
					label: 'Pogoda',
					component: 'sidebar.weather',
					widget: {
						terytPowiat: '1433',
						mapCenter: { lat: 52.47, lon: 22.09 },
					},
				},
			],
			navigationPath: '',
			categoriesPath: '',
		});
		expect(config?.terytPowiat).toBe('1433');
	});

	it('returns null when terytPowiat missing', () => {
		const config = findWeatherSlot({
			navigation: [],
			categoryDisplays: {},
			categories: [],
			slots: [
				{
					id: 'sidebar_weather',
					label: 'Pogoda',
					component: 'sidebar.weather',
					widget: { enabled: true },
				},
			],
			navigationPath: '',
			categoriesPath: '',
		});
		expect(config).toBeNull();
	});
});
