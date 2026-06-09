import type { WeatherSlotWidgetConfig } from '@/lib/astro-layout/types';
import {
	buildMapScope,
	type OsmetTerytResponse,
	type OsmetWarning,
	type WeatherWarning,
	type WeatherWarningLevel,
	type WeatherWarningsFile,
} from './types';

function parseLevel(raw: string | undefined): WeatherWarningLevel | null {
	const n = Number(raw);
	if (n === 1 || n === 2 || n === 3) return n;
	return null;
}

function parseIsoDate(raw: string | undefined, fallback: string): string {
	const trimmed = raw?.trim();
	if (!trimmed) return fallback;
	const parsed = Date.parse(trimmed);
	if (Number.isNaN(parsed)) return fallback;
	return new Date(parsed).toISOString();
}

function isWarningActive(warning: OsmetWarning, now: Date): boolean {
	const endRaw = warning.LxValidTo ?? warning.ValidTo;
	const end = Date.parse(endRaw.replace(' ', 'T'));
	if (Number.isNaN(end)) return true;
	return end >= now.getTime();
}

function toWeatherWarning(id: string, warning: OsmetWarning): WeatherWarning | null {
	const level = parseLevel(warning.Level);
	if (!level) return null;
	return {
		id,
		level,
		phenomenon: warning.PhenomenonName.trim(),
		validFrom: parseIsoDate(warning.LxValidFrom, warning.ValidFrom),
		validTo: parseIsoDate(warning.LxValidTo, warning.ValidTo),
		content: warning.Content.trim(),
	};
}

export function buildTerytLevels(
	teryt: Record<string, string[]>,
	warnings: Record<string, OsmetWarning>,
	scope: string[],
): Record<string, number> {
	const levels: Record<string, number> = {};
	for (const code of scope) {
		const ids = teryt[code] ?? [];
		let max = 0;
		for (const id of ids) {
			const level = parseLevel(warnings[id]?.Level);
			if (level && level > max) max = level;
		}
		if (max > 0) levels[code] = max;
	}
	return levels;
}

export function normalizeOsmetTeryt(
	raw: OsmetTerytResponse,
	config: WeatherSlotWidgetConfig,
	now = new Date(),
): WeatherWarningsFile {
	const terytPowiat = config.terytPowiat?.trim() ?? '';
	const mapScope = buildMapScope(config);
	const warningIds = new Set(raw.teryt[terytPowiat] ?? []);

	const active: WeatherWarning[] = [];
	for (const id of warningIds) {
		const warning = raw.warnings[id];
		if (!warning || !isWarningActive(warning, now)) continue;
		const normalized = toWeatherWarning(id, warning);
		if (normalized) active.push(normalized);
	}

	active.sort((a, b) => b.level - a.level || a.validTo.localeCompare(b.validTo));

	const updatedAt =
		raw.program?.LxExportTime?.trim() ||
		raw.program?.ExportTime?.trim() ||
		now.toISOString();

	return {
		updatedAt,
		source: 'IMGW-PIB',
		config: {
			terytPowiat,
			mapCenter: config.mapCenter ?? { lat: 0, lon: 0 },
			mapZoom: config.mapZoom ?? 11,
			showMap: config.showMap !== false,
			mapScopePowiaty: config.mapScopePowiaty ?? [],
		},
		active,
		terytLevels: buildTerytLevels(raw.teryt, raw.warnings, mapScope),
		mapScope,
	};
}
