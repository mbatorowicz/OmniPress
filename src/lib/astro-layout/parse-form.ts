/**
 * Zapis layoutu z FormData na stan `SiteAstroLayout` — składanie sekcji formularza.
 * Szczegóły w modułach obok: `parse-form-fields` (pola), `parse-form-widgets` i `parse-form-footer`
 * (widgety), `parse-form-slots` (sloty i strefy), `parse-form-nav` (drzewo nawigacji),
 * `parse-form-categories` (kategorie i przypisania do feedów).
 */
import { parseNavEditorDepthColorsFromForm } from '@/lib/admin/nav-editor-colors';
import { type LayoutZone } from './components';
import { sortSlotsByOrder } from './slots';
import { normalizeLayoutSlots, syncNavigationInLayout } from './migrate-layout';
import {
	flattenSlots,
	isLayoutZone,
	mergeZoneComponents,
	migrateFlatSlotsToZones,
	resolveLayoutZones,
	emptyZones,
} from './zones';
import { classifyRegistryGroup } from '@/lib/admin/component-registry';
import { UNIT_COMPONENT_ZONES } from '@/lib/admin/layout-editor-tabs';
import {
	mergeSlotsFromForm,
	parseSlotsFromForm,
	parseSlotsFromFormForZone,
} from './parse-form-slots';
import { parseNavigationSection } from './parse-form-nav';
import {
	parseCategoriesFromForm,
	parseCategoryDisplaysFromForm,
	pruneCategoryDisplays,
} from './parse-form-categories';
import type { SiteAstroLayout } from './types';

export { collectSlotIdentities, type SlotIdentity } from './parse-form-fields';
export { parseSlotsFromFormForZone } from './parse-form-slots';
export { parseNavigationFromForm } from './parse-form-nav';

export type LayoutFormSection = 'navigation' | 'categories' | 'components' | 'layout' | 'all';

export type LayoutFormError =
	| 'invalid_navigation'
	| 'no_categories'
	| 'invalid_category_slug'
	| 'duplicate_category_slug'
	| 'no_slots'
	| 'invalid_section';

function mergeZoneComponentsFromForm(
	form: FormData,
	zone: LayoutZone,
	existing: SiteAstroLayout,
): SiteAstroLayout['zones'] {
	const zones = resolveLayoutZones(existing);
	const existingZone = zones[zone].components;
	const parsed = parseSlotsFromForm(form, existingZone);
	const parsedIds = new Set(parsed.map((s) => s.id));
	const preserved = existingZone.filter((s) => !parsedIds.has(s.id));
	return mergeZoneComponents(zones, zone, sortSlotsByOrder([...preserved, ...parsed]));
}

export function mergeUnitRegistryZonesFromForm(
	form: FormData,
	existing: SiteAstroLayout,
): SiteAstroLayout['zones'] {
	let zones = resolveLayoutZones(existing);
	for (const zone of UNIT_COMPONENT_ZONES) {
		const existingZone = zones[zone].components;
		const parsed = parseSlotsFromFormForZone(form, zone, existingZone);
		const parsedIds = new Set(parsed.map((s) => s.id));
		// Formularz rejestru jednostek dotyczy tylko swoich grup — reszta strefy zostaje nietknięta.
		const preserved = existingZone.filter((slot) => {
			if (parsedIds.has(slot.id)) return false;
			return classifyRegistryGroup(slot) === null;
		});
		zones = mergeZoneComponents(zones, zone, sortSlotsByOrder([...preserved, ...parsed]));
	}
	return zones;
}

function mergeComponentsSection(
	form: FormData,
	layout: SiteAstroLayout,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: LayoutFormError } {
	const layoutMode = String(form.get('layout_mode') ?? '').trim();
	const zoneRaw = String(form.get('layout_zone') ?? '').trim();

	if (layoutMode === 'unit_registry') {
		layout.zones = mergeUnitRegistryZonesFromForm(form, layout);
		layout.slots = flattenSlots(layout.zones);
	} else if (zoneRaw && isLayoutZone(zoneRaw)) {
		layout.zones = mergeZoneComponentsFromForm(form, zoneRaw, layout);
		layout.slots = flattenSlots(layout.zones);
	} else {
		const slots = mergeSlotsFromForm(form, layout.slots);
		if (slots.length === 0) return { ok: false, error: 'no_slots' };
		layout.slots = slots;
		layout.zones = migrateFlatSlotsToZones(slots);
	}

	if (flattenSlots(layout.zones).length === 0) return { ok: false, error: 'no_slots' };
	return { ok: true, layout };
}

export function mergeLayoutFromFormData(
	form: FormData,
	existing: SiteAstroLayout,
	section: LayoutFormSection,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: LayoutFormError } {
	let layout: SiteAstroLayout = { ...existing, zones: resolveLayoutZones(existing) };

	if (section === 'navigation' || section === 'all' || section === 'layout') {
		const navigation = parseNavigationSection(form);
		if ('error' in navigation) return { ok: false, error: navigation.error };
		layout.navEditorDepthColors = parseNavEditorDepthColorsFromForm(form);
		layout = syncNavigationInLayout(layout, navigation);
	}

	if (section === 'components' || section === 'all' || section === 'layout') {
		const merged = mergeComponentsSection(form, layout);
		if (!merged.ok) return merged;
		layout = merged.layout;
	}

	if (section === 'categories' || section === 'all') {
		const parsed = parseCategoriesFromForm(form);
		if (!parsed.ok) return parsed;
		if (parsed.categories.length === 0) return { ok: false, error: 'no_categories' };
		const categories = parsed.categories;
		layout.categories = categories;
		layout.categoryDisplays =
			section === 'all'
				? parseCategoryDisplaysFromForm(form, layout.slots, categories, {})
				: pruneCategoryDisplays(existing, categories);
	}

	if (section === 'components') {
		layout.categoryDisplays = parseCategoryDisplaysFromForm(
			form,
			layout.slots,
			existing.categories,
			existing.categoryDisplays,
		);
	}

	layout = normalizeLayoutSlots(layout);
	return { ok: true, layout };
}

/** @deprecated Użyj mergeLayoutFromFormData z section=all */
export function parseLayoutFromFormData(
	form: FormData,
	base: Pick<SiteAstroLayout, 'navigationPath' | 'categoriesPath' | 'layoutPath'>,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: string } {
	const existing: SiteAstroLayout = {
		navigation: [],
		categories: [],
		categoryDisplays: {},
		zones: emptyZones(),
		slots: [],
		layoutPath: base.layoutPath,
		navigationPath: base.navigationPath,
		categoriesPath: base.categoriesPath,
	};
	return mergeLayoutFromFormData(form, existing, 'all');
}

export function parseLayoutSection(
	form: FormData,
	existing: SiteAstroLayout,
): ReturnType<typeof mergeLayoutFromFormData> {
	const raw = String(form.get('section') ?? 'all').trim();
	const section: LayoutFormSection =
		raw === 'navigation' ||
		raw === 'categories' ||
		raw === 'components' ||
		raw === 'layout' ||
		raw === 'all'
			? raw
			: 'all';
	return mergeLayoutFromFormData(form, existing, section);
}
