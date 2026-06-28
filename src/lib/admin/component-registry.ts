import { UNIT_COMPONENT_ZONES } from '@/lib/admin/layout-editor-tabs';
import {
	getComponentKind,
	isSingletonComponent,
	type LayoutComponentId,
	type LayoutZone,
} from '@/lib/astro-layout/components';
import type { DisplaySlot, SiteAstroLayout, SlotWidgetConfig } from '@/lib/astro-layout/types';
import { resolveLayoutZones } from '@/lib/astro-layout/zones';

export const COMPONENT_REGISTRY_GROUPS = ['special', 'categories', 'links', 'banners'] as const;

export type ComponentRegistryGroup = (typeof COMPONENT_REGISTRY_GROUPS)[number];

export type ComponentAddTemplateId = 'category' | 'external_link' | 'static_page' | 'banner';

export type ComponentAddTemplate = {
	id: ComponentAddTemplateId;
	component: LayoutComponentId;
	defaultWidget: Partial<SlotWidgetConfig>;
	allowedZones: readonly LayoutZone[];
	registryGroup: ComponentRegistryGroup;
};

export const COMPONENT_ADD_TEMPLATES: Record<ComponentAddTemplateId, ComponentAddTemplate> = {
	category: {
		id: 'category',
		component: 'home.latest',
		defaultWidget: {},
		allowedZones: ['home'],
		registryGroup: 'categories',
	},
	external_link: {
		id: 'external_link',
		component: 'sidebar.banner',
		defaultWidget: { linkType: 'external' },
		allowedZones: ['sidebar', 'footer', 'home'],
		registryGroup: 'links',
	},
	static_page: {
		id: 'static_page',
		component: 'sidebar.banner',
		defaultWidget: { linkType: 'page' },
		allowedZones: ['sidebar', 'footer', 'home'],
		registryGroup: 'links',
	},
	banner: {
		id: 'banner',
		component: 'sidebar.banner',
		defaultWidget: { linkType: 'category', style: 'image' },
		allowedZones: ['sidebar', 'footer', 'home'],
		registryGroup: 'banners',
	},
};

export const SPECIAL_COMPONENT_OPTIONS = [
	{ component: 'sidebar.weather' as const, registryGroup: 'special' as const },
	{ component: 'sidebar.cert_advisories' as const, registryGroup: 'special' as const },
	{ component: 'sidebar.recent_changes' as const, registryGroup: 'special' as const },
];

export type RegistrySlotEntry = { slot: DisplaySlot; zone: LayoutZone };

export function classifyRegistryGroup(slot: DisplaySlot): ComponentRegistryGroup | null {
	const kind = getComponentKind(slot.component);
	if (!kind || kind === 'chrome' || kind === 'navigation') return null;
	if (kind === 'live_feed' || kind === 'local_feed') return 'special';
	if (kind === 'home_feed') return 'categories';
	if (kind === 'banner') {
		const linkType = slot.widget?.linkType ?? 'category';
		if (linkType === 'external' || linkType === 'page') return 'links';
		return 'banners';
	}
	return null;
}

export function flattenUnitComponentSlots(layout: SiteAstroLayout): RegistrySlotEntry[] {
	const zones = resolveLayoutZones(layout);
	const entries: RegistrySlotEntry[] = [];
	for (const zone of UNIT_COMPONENT_ZONES) {
		for (const slot of zones[zone].components) {
			if (classifyRegistryGroup(slot) === null) continue;
			entries.push({ slot, zone });
		}
	}
	return entries;
}

export function groupSlotsByRegistry(
	entries: RegistrySlotEntry[],
): Record<ComponentRegistryGroup, RegistrySlotEntry[]> {
	const groups = Object.fromEntries(
		COMPONENT_REGISTRY_GROUPS.map((group) => [group, [] as RegistrySlotEntry[]]),
	) as Record<ComponentRegistryGroup, RegistrySlotEntry[]>;

	for (const entry of entries) {
		const group = classifyRegistryGroup(entry.slot);
		if (group) groups[group].push(entry);
	}

	for (const group of COMPONENT_REGISTRY_GROUPS) {
		groups[group].sort(
			(a, b) => (a.slot.widget?.order ?? 0) - (b.slot.widget?.order ?? 0),
		);
	}
	return groups;
}

export function listUsedSingletonComponents(entries: RegistrySlotEntry[]): Set<LayoutComponentId> {
	const used = new Set<LayoutComponentId>();
	for (const { slot } of entries) {
		if (isSingletonComponent(slot.component)) {
			used.add(slot.component as LayoutComponentId);
		}
	}
	return used;
}

export function getAddTemplatesForGroup(
	group: ComponentRegistryGroup,
): ComponentAddTemplate[] {
	return Object.values(COMPONENT_ADD_TEMPLATES).filter((template) => template.registryGroup === group);
}

export function getAvailableSpecialComponents(
	entries: RegistrySlotEntry[],
): typeof SPECIAL_COMPONENT_OPTIONS {
	const used = listUsedSingletonComponents(entries);
	return SPECIAL_COMPONENT_OPTIONS.filter((option) => !used.has(option.component));
}
