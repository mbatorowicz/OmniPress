import type { WeatherSlotWidgetConfig } from '@/lib/astro-layout/types';
import { powiatName14 } from './powiaty-14';
import type {
	OsmetTerytResponse,
	OsmetWarning,
	WeatherWarning,
	WeatherWarningLevel,
	WeatherWarningsFile,
} from './types';

const VOIVODESHIP_PREFIX = '14';

function parseLevel(raw: string | undefined): WeatherWarningLevel | null {
	const n = Number(raw);
	if (n === 1 || n === 2 || n === 3) return n;
	return null;
}

function parseIsoDate(raw: string | undefined, fallback: string): string {
	const trimmed = raw?.trim();
	if (!trimmed) return fallback;
	const parsed = Date.parse(trimmed.replace(' ', 'T'));
	if (Number.isNaN(parsed)) return fallback;
	return new Date(parsed).toISOString();
}

function isWarningActive(warning: OsmetWarning, now: Date): boolean {
	const endRaw = warning.LxValidTo ?? warning.ValidTo;
	const end = Date.parse(endRaw.replace(' ', 'T'));
	if (Number.isNaN(end)) return true;
	return end >= now.getTime();
}

function affectedPowiatyForWarning(
	id: string,
	teryt: Record<string, string[]>,
	localPowiat: string,
): WeatherWarning['affectedPowiaty'] {
	return Object.entries(teryt)
		.filter(([code, ids]) => code.startsWith(VOIVODESHIP_PREFIX) && ids.includes(id))
		.map(([code]) => code)
		.sort()
		.map((code) => ({
			code,
			name: powiatName14(code),
			isLocal: code === localPowiat,
		}));
}

function toWeatherWarning(
	id: string,
	warning: OsmetWarning,
	teryt: Record<string, string[]>,
	localPowiat: string,
): WeatherWarning | null {
	const level = parseLevel(warning.Level);
	if (!level) return null;
	const affectedPowiaty = affectedPowiatyForWarning(id, teryt, localPowiat);
	const probabilityRaw = warning.Probability;
	return {
		id,
		level,
		phenomenonCode: warning.PhenomenonCode?.trim() ?? '',
		phenomenon: warning.PhenomenonName.trim(),
		probability:
			probabilityRaw === null || probabilityRaw === undefined || probabilityRaw === ''
				? ''
				: String(probabilityRaw).trim(),
		validFrom: parseIsoDate(warning.LxValidFrom, warning.ValidFrom),
		validTo: parseIsoDate(warning.LxValidTo, warning.ValidTo),
		content: warning.Content.trim(),
		comments: warning.Comments?.trim() ?? '',
		sms: warning.SMS?.trim() ?? '',
		office: warning.Name2?.trim() ?? '',
		rcb: Boolean(warning.Rcb),
		publishedAt: parseIsoDate(warning.LxReleaseDateTime, warning.ReleaseDateTime ?? ''),
		affectedPowiaty,
		affectsLocalPowiat: affectedPowiaty.some((powiat) => powiat.isLocal),
	};
}

export function buildMapHighlight(
	active: WeatherWarning[],
	terytPowiat: string,
): string[] {
	const codes = new Set<string>();
	const primary = terytPowiat.trim();
	if (primary) codes.add(primary);
	for (const warning of active) {
		for (const powiat of warning.affectedPowiaty) {
			codes.add(powiat.code);
		}
	}
	return [...codes].sort();
}

export function buildFullMapScope(
	highlight: string[],
	config: WeatherSlotWidgetConfig,
): string[] {
	const neighbors = (config.mapScopePowiaty ?? []).map((c) => c.trim()).filter(Boolean);
	const scope = new Set([...highlight, ...neighbors]);
	return [...scope].sort();
}

export function buildTerytLevels(
	teryt: Record<string, string[]>,
	warnings: Record<string, OsmetWarning>,
	scope: string[],
	activeWarningIds: ReadonlySet<string>,
): Record<string, number> {
	const levels: Record<string, number> = {};
	for (const code of scope) {
		const ids = teryt[code] ?? [];
		let max = 0;
		for (const id of ids) {
			if (!activeWarningIds.has(id)) continue;
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
	const warningIds = new Set<string>();
	for (const [code, ids] of Object.entries(raw.teryt)) {
		if (!code.startsWith(VOIVODESHIP_PREFIX)) continue;
		for (const id of ids) warningIds.add(id);
	}

	const active: WeatherWarning[] = [];
	for (const id of warningIds) {
		const warning = raw.warnings[id];
		if (!warning || !isWarningActive(warning, now)) continue;
		const normalized = toWeatherWarning(id, warning, raw.teryt, terytPowiat);
		if (!normalized?.affectsLocalPowiat) continue;
		active.push(normalized);
	}

	active.sort((a, b) => b.level - a.level || a.validTo.localeCompare(b.validTo));

	const activeWarningIds = new Set(active.map((w) => w.id));
	const mapHighlight = buildMapHighlight(active, terytPowiat);
	const mapScope = buildFullMapScope(mapHighlight, config);
	const terytLevels = buildTerytLevels(
		raw.teryt,
		raw.warnings,
		mapHighlight,
		activeWarningIds,
	);

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
		terytLevels,
		mapHighlight,
		mapScope,
	};
}
