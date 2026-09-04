import { normalizeCategoryDefinition } from './category-archive';
import { normalizeLayoutSlots } from './migrate-layout';
import { parseSlot } from './parse-widget';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';
import type {
	CategoryDefinition,
	CategoryDisplays,
	DisplaySlot,
	LayoutZonesMap,
	SiteAstroLayout,
} from './types';
import { exportZonesPayload, flattenSlots, migrateFlatSlotsToZones, parseZonesFromFile } from './zones';

export function parseSlots(raw: unknown): DisplaySlot[] {
	if (!Array.isArray(raw)) return [];
	return sortSlotsByOrder(raw.map(parseSlot).filter((s): s is DisplaySlot => s !== null));
}

export function parseLayoutFile(text: string): {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
	zones: LayoutZonesMap;
} {
	const parsed = JSON.parse(text) as unknown;

	if (Array.isArray(parsed)) {
		const empty = migrateFlatSlotsToZones([]);
		return {
			categories: parsed
				.map(normalizeCategoryDefinition)
				.filter((c): c is CategoryDefinition => c !== null),
			slots: [],
			zones: empty,
			displays: {},
		};
	}

	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Nieprawidłowy plik layoutu');
	}

	const obj = parsed as {
		categories?: CategoryDefinition[];
		displays?: CategoryDisplays;
		slots?: unknown;
		zones?: unknown;
	};

	const categories = (obj.categories ?? [])
		.map(normalizeCategoryDefinition)
		.filter((c): c is CategoryDefinition => c !== null);

	const legacySlots = parseSlots(obj.slots);
	const zones = parseZonesFromFile(obj, legacySlots);
	const slots = flattenSlots(zones);
	const displays = mergeCategoryDisplays(slots, obj.displays ?? {});

	return { categories, displays, slots, zones };
}

export function parseCategoriesFile(text: string): {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
} {
	return parseLayoutFile(text);
}

export function buildLayoutFilePayload(layout: SiteAstroLayout): string {
	const normalized = normalizeLayoutSlots(layout);
	return `${JSON.stringify(
		{
			categories: normalized.categories,
			displays: normalized.categoryDisplays,
			zones: exportZonesPayload(normalized.zones),
		},
		null,
		'\t',
	)}\n`;
}

export function buildCategoriesFilePayload(layout: SiteAstroLayout): string {
	return buildLayoutFilePayload(layout);
}
