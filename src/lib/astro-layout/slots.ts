import type { CategoryDisplays, DisplaySlot, SiteAstroLayout, SlotWidgetConfig } from './types';
import { isCategoryFeedComponent, isLayoutComponentId } from './components';

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

/** Zamienia wartości order dwóch sąsiednich slotów (używane przy reorder ↑↓). */
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
	return layout.slots.find((s) => s.component === component);
}

export function findSlotsByComponent(layout: SiteAstroLayout, component: string): DisplaySlot[] {
	return layout.slots.filter((s) => s.component === component);
}

export function getSidebarSlots(layout: SiteAstroLayout): DisplaySlot[] {
	return sortSlotsByOrder(layout.slots.filter((s) => s.component.startsWith('sidebar.')));
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

export type SlotEditorZone = 'home' | 'sidebar';

export function readSlotEditorZone(component: string): SlotEditorZone {
	return component.startsWith('sidebar.') ? 'sidebar' : 'home';
}

/** Kolejność slotów w edytorze i na stronie (strefa home przed sidebar). */
export function sortSlotsForEditor(slots: DisplaySlot[]): DisplaySlot[] {
	return [...slots].sort((a, b) => {
		const zoneA = readSlotEditorZone(a.component);
		const zoneB = readSlotEditorZone(b.component);
		if (zoneA !== zoneB) return zoneA === 'home' ? -1 : 1;
		const ao = a.widget?.order ?? Number.MAX_SAFE_INTEGER;
		const bo = b.widget?.order ?? Number.MAX_SAFE_INTEGER;
		if (ao !== bo) return ao - bo;
		return a.id.localeCompare(b.id);
	});
}

export function isValidSlotComponent(component: string): boolean {
	return isLayoutComponentId(component);
}
