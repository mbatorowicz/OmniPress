import { normalizeSlug } from '@/lib/admin/slug';
import { flattenSlots, resolveLayoutZones } from '@/lib/astro-layout/zones';
import type {
	CategoryDefinition,
	CategoryDisplays,
	DisplaySlot,
	LayoutZonesMap,
	SiteAstroLayout,
} from '@/lib/astro-layout/types';

export type CategorySlugRemap = {
	from: string;
	to: string;
	name: string;
};

export type CategoryFormPair = {
	prevSlug: string;
	slug: string;
	name: string;
	entry?: string;
};

function slugKey(raw: string): string {
	return normalizeSlug(raw.trim());
}

function remapMap(remaps: readonly CategorySlugRemap[]): Map<string, CategorySlugRemap> {
	return new Map(remaps.map((item) => [item.from, item]));
}

export function detectCategorySlugRemaps(
	previous: readonly Pick<CategoryDefinition, 'slug'>[],
	next: readonly Pick<CategoryDefinition, 'slug' | 'name'>[],
	formPairs: readonly CategoryFormPair[] = [],
): CategorySlugRemap[] {
	const found = new Map<string, CategorySlugRemap>();

	for (const pair of formPairs) {
		const from = slugKey(pair.prevSlug);
		const to = slugKey(pair.slug);
		if (!from || !to || from === to) continue;
		found.set(from, { from, to, name: pair.name.trim() || to });
	}

	const prevSlugs = previous.map((item) => slugKey(item.slug)).filter(Boolean);
	const nextBySlug = new Map(
		next
			.map((item) => [slugKey(item.slug), item] as const)
			.filter(([slug]) => Boolean(slug)),
	);
	const prevSet = new Set(prevSlugs);
	const nextSet = new Set(nextBySlug.keys());
	const removed = prevSlugs.filter((slug) => !nextSet.has(slug) && !found.has(slug));
	const added = [...nextSet].filter((slug) => !prevSet.has(slug));

	if (removed.length === 1 && added.length === 1) {
		const from = removed[0]!;
		const to = added[0]!;
		const name = nextBySlug.get(to)?.name.trim() || to;
		found.set(from, { from, to, name });
	}

	return [...found.values()];
}

export function applyCategorySlugRemapsToDisplays(
	displays: CategoryDisplays,
	remaps: readonly CategorySlugRemap[],
): CategoryDisplays {
	const map = remapMap(remaps);
	if (map.size === 0) return displays;
	const next: CategoryDisplays = {};
	for (const [slotId, slugs] of Object.entries(displays)) {
		next[slotId] = slugs.map((slug) => map.get(slug)?.to ?? slug);
	}
	return next;
}

export function applyCategorySlugRemapsToSlots(
	slots: readonly DisplaySlot[],
	remaps: readonly CategorySlugRemap[],
): DisplaySlot[] {
	const map = remapMap(remaps);
	if (map.size === 0) return [...slots];
	return slots.map((slot) => {
		const slug = slot.widget?.categorySlug?.trim();
		if (!slug || !map.has(slug)) return slot;
		return {
			...slot,
			widget: { ...slot.widget, categorySlug: map.get(slug)!.to },
		};
	});
}

function applyRemapsToZones(
	zones: LayoutZonesMap,
	remaps: readonly CategorySlugRemap[],
): LayoutZonesMap {
	const next = { ...zones };
	for (const zone of Object.keys(zones) as Array<keyof LayoutZonesMap>) {
		next[zone] = {
			components: applyCategorySlugRemapsToSlots(zones[zone].components, remaps),
		};
	}
	return next;
}

export function applyCategorySlugRemapsToLayout(
	layout: SiteAstroLayout,
	remaps: readonly CategorySlugRemap[],
): SiteAstroLayout {
	if (remaps.length === 0) return layout;
	const slots = applyCategorySlugRemapsToSlots(layout.slots, remaps);
	const zones = applyRemapsToZones(resolveLayoutZones(layout), remaps);
	const fromZones = flattenSlots(zones);
	return {
		...layout,
		categoryDisplays: applyCategorySlugRemapsToDisplays(layout.categoryDisplays, remaps),
		zones,
		slots: fromZones.length > 0 ? fromZones : slots,
	};
}
