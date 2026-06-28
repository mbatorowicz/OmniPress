import {
	getDefaultComponentZone,
	isComponentAllowedInZone,
	isLayoutComponentId,
	LAYOUT_ZONE_ORDER,
	type LayoutComponentId,
	type LayoutZone,
} from './components';
import type { DisplaySlot, LayoutZonesMap, SiteAstroLayout } from './types';
import { sortSlotsByOrder } from './slots';

export type { LayoutZonesMap };

export function emptyZones(): LayoutZonesMap {
	return Object.fromEntries(
		LAYOUT_ZONE_ORDER.map((zone) => [zone, { components: [] as DisplaySlot[] }]),
	) as LayoutZonesMap;
}

export function migrateFlatSlotsToZones(slots: DisplaySlot[]): LayoutZonesMap {
	const zones = emptyZones();
	for (const slot of sortSlotsByOrder(slots)) {
		const zone = getDefaultComponentZone(slot.component);
		if (!zone) continue;
		zones[zone].components.push(slot);
	}
	return zones;
}

export function flattenSlots(zones: LayoutZonesMap): DisplaySlot[] {
	const out: DisplaySlot[] = [];
	for (const zone of LAYOUT_ZONE_ORDER) {
		out.push(...zones[zone].components);
	}
	return out;
}

export function getZoneComponents(zones: LayoutZonesMap, zone: LayoutZone): DisplaySlot[] {
	return zones[zone]?.components ?? [];
}

export function syncSlotsFromZones(zones: LayoutZonesMap): DisplaySlot[] {
	return flattenSlots(zones);
}

export function resolveLayoutZones(layout: Pick<SiteAstroLayout, 'zones' | 'slots'>): LayoutZonesMap {
	if (
		layout.zones &&
		LAYOUT_ZONE_ORDER.every((zone) => Array.isArray(layout.zones[zone]?.components))
	) {
		return normalizeZonesShape(layout.zones);
	}
	return migrateFlatSlotsToZones(layout.slots ?? []);
}

function normalizeZonesShape(raw: LayoutZonesMap): LayoutZonesMap {
	const zones = emptyZones();
	for (const zone of LAYOUT_ZONE_ORDER) {
		const section = raw[zone];
		if (!section || !Array.isArray(section.components)) continue;
		zones[zone].components = sortSlotsByOrder(
			section.components.filter(
				(s): s is DisplaySlot =>
					Boolean(
						s?.id &&
							s?.label &&
							s?.component &&
							isLayoutComponentId(String(s.component)) &&
							isComponentAllowedInZone(String(s.component), zone),
					),
			),
		);
	}
	return zones;
}

const COMPONENT_ID_SUFFIX: Partial<Record<LayoutComponentId, string>> = {
	'site.meta': 'meta',
	'topbar.tagline': 'tagline',
	'header.brand': 'brand',
	'header.navigation': 'navigation',
	'home.pinned': 'pinned',
	'home.latest': 'latest',
	'sidebar.weather': 'weather',
	'sidebar.cert_advisories': 'cert',
	'sidebar.recent_changes': 'recent_changes',
	'sidebar.banner': 'banner',
	'footer.main': 'main',
};

export function generateComponentInstanceId(
	zone: LayoutZone,
	component: string,
	existing: DisplaySlot[],
): string {
	const short =
		(isLayoutComponentId(component) ? COMPONENT_ID_SUFFIX[component] : undefined) ??
		component.split('.').pop() ??
		'item';
	const base = `${zone}_${short}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
	const ids = new Set(existing.map((s) => s.id));
	if (!ids.has(base)) return base;
	for (let n = 2; n < 1000; n++) {
		const candidate = `${base}_${n}`;
		if (!ids.has(candidate)) return candidate;
	}
	return `${base}_${Date.now()}`;
}

export function mergeZoneComponents(
	zones: LayoutZonesMap,
	zone: LayoutZone,
	components: DisplaySlot[],
): LayoutZonesMap {
	const validated = components.filter(
		(s) => s?.id && s?.component && isComponentAllowedInZone(s.component, zone),
	);
	return {
		...zones,
		[zone]: { components: sortSlotsByOrder(validated) },
	};
}

export function parseZonesFromFile(raw: unknown, fallbackSlots: DisplaySlot[] = []): LayoutZonesMap {
	if (!raw || typeof raw !== 'object') {
		return migrateFlatSlotsToZones(fallbackSlots);
	}
	const zonesRaw = (raw as { zones?: unknown }).zones;
	if (!zonesRaw || typeof zonesRaw !== 'object') {
		return migrateFlatSlotsToZones(fallbackSlots);
	}
	return normalizeZonesShape(zonesRaw as LayoutZonesMap);
}

export function isLayoutZone(value: string): value is LayoutZone {
	return (LAYOUT_ZONE_ORDER as readonly string[]).includes(value);
}

export function exportZonesPayload(zones: LayoutZonesMap): LayoutZonesMap {
	const out = emptyZones();
	for (const zone of LAYOUT_ZONE_ORDER) {
		out[zone] = {
			components: zones[zone].components.map((slot) => {
				const { id, label, component, widget, entries } = slot;
				const exported: DisplaySlot = { id, label, component };
				if (widget && Object.keys(widget).length > 0) exported.widget = widget;
				if (entries?.length) exported.entries = entries;
				return exported;
			}),
		};
	}
	return out;
}
