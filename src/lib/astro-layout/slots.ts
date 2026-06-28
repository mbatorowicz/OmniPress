import type { CategoryDisplays, DisplaySlot, SiteAstroLayout, SlotWidgetConfig } from './types';
import {
	getComponentZone,
	isCategoryFeedComponent,
	isLayoutComponentId,
	LAYOUT_ZONE_ORDER,
	type LayoutZone,
} from './components';
import { flattenSlots, resolveLayoutZones } from './zones';

export function emptyDisplaysForSlots(slots: DisplaySlot[]): CategoryDisplays {
	return Object.fromEntries(
		slots.filter((s) => isCategoryFeedComponent(s.component)).map((s) => [s.id, []]),
	);
}

export function mergeCategoryDisplays(
	slots: DisplaySlot[],
	displays: CategoryDisplays,
): CategoryDisplays {
	const base = emptyDisplaysForSlots(slots);
	for (const slot of slots) {
		if (!isCategoryFeedComponent(slot.component)) continue;
		const fromFile = displays[slot.id];
		if (Array.isArray(fromFile)) base[slot.id] = fromFile.filter(Boolean);
	}
	return base;
}

export function swapAdjacentOrders(a: number, b: number): [number, number] {
	return [b, a];
}

export function sortSlotsByOrder(slots: DisplaySlot[]): DisplaySlot[] {
	return [...slots].sort((a, b) => {
		const ao = a.widget?.order ?? Number.MAX_SAFE_INTEGER;
		const bo = b.widget?.order ?? Number.MAX_SAFE_INTEGER;
		if (ao !== bo) return ao - bo;
		return a.id.localeCompare(b.id);
	});
}

export function findSlotByComponent(
	layout: SiteAstroLayout,
	component: string,
): DisplaySlot | undefined {
	return getLayoutSlots(layout).find((s) => s.component === component);
}

export function findSlotsByComponent(layout: SiteAstroLayout, component: string): DisplaySlot[] {
	return getLayoutSlots(layout).filter((s) => s.component === component);
}

function getLayoutSlots(layout: SiteAstroLayout): DisplaySlot[] {
	if (layout.slots.length > 0) return layout.slots;
	return flattenSlots(resolveLayoutZones(layout));
}

export function getSidebarSlots(layout: SiteAstroLayout): DisplaySlot[] {
	return getSlotsByZone(getLayoutSlots(layout), 'sidebar');
}

export function getSlotWidget(layout: SiteAstroLayout, component: string): SlotWidgetConfig | undefined {
	return findSlotByComponent(layout, component)?.widget;
}

export function getCategoryFeedSlots(slots: DisplaySlot[]): DisplaySlot[] {
	return slots.filter((s) => isCategoryFeedComponent(s.component));
}

export function resolveHomeFeedSectionTitle(slot: DisplaySlot): string {
	const w = slot.widget ?? {};
	return (w.sectionTitle ?? w.title ?? slot.label).trim();
}

export type SlotEditorZone = LayoutZone;

export function readSlotEditorZone(component: string): SlotEditorZone {
	return getComponentZone(component) ?? 'home';
}

export function zoneSortIndex(zone: LayoutZone): number {
	const idx = LAYOUT_ZONE_ORDER.indexOf(zone);
	return idx === -1 ? LAYOUT_ZONE_ORDER.length : idx;
}

export function getSlotsByZone(slots: DisplaySlot[], zone: LayoutZone): DisplaySlot[] {
	return sortSlotsByOrder(
		slots.filter((s) => getComponentZone(s.component) === zone && s.widget?.enabled !== false),
	);
}

export function sortSlotsForEditor(slots: DisplaySlot[]): DisplaySlot[] {
	return [...slots].sort((a, b) => {
		const zoneA = readSlotEditorZone(a.component);
		const zoneB = readSlotEditorZone(b.component);
		const zi = zoneSortIndex(zoneA) - zoneSortIndex(zoneB);
		if (zi !== 0) return zi;
		const ao = a.widget?.order ?? Number.MAX_SAFE_INTEGER;
		const bo = b.widget?.order ?? Number.MAX_SAFE_INTEGER;
		if (ao !== bo) return ao - bo;
		return a.id.localeCompare(b.id);
	});
}

export function isValidSlotComponent(component: string): boolean {
	return isLayoutComponentId(component);
}
