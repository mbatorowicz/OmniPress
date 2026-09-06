import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/admin/slug';
import { LAYOUT_COMPONENT_IDS, LAYOUT_ZONE_ORDER } from './components';

/**
 * Kontrakt pliku `omnipress-layout.json` zapisany przez `buildLayoutFilePayload`.
 * SSOT po stronie OmniPress — czytnik w repo Astro: `src/config/load-config.ts`.
 *
 * Root jest `.strict()` — klucze legacy (`slots`, `weather`) nie mogą trafić do publikacji.
 */
const recentChangeEntrySchema = z.object({
	title: z.string(),
	href: z.string(),
	kind: z.enum(['news', 'page', 'layout', 'manual']),
	changedAt: z.string(),
	sourceId: z.string().optional(),
});

const slotWidgetSchema = z.record(z.string(), z.unknown()).optional();

const displaySlotSchema = z.object({
	id: z.string().min(1),
	label: z.string(),
	component: z.string().min(1),
	widget: slotWidgetSchema,
	entries: z.array(recentChangeEntrySchema).optional(),
});

const layoutZoneSectionSchema = z.object({
	components: z.array(displaySlotSchema),
});

const categorySchema = z.object({
	slug: z.string().regex(SLUG_PATTERN),
	name: z.string(),
	archiveLayout: z.enum(['tiles', 'title-list']).optional(),
	archiveColumns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

function uniqueCategorySlugs(categories: Array<{ slug: string }>, ctx: z.RefinementCtx): void {
	const seen = new Set<string>();
	categories.forEach((category, index) => {
		const key = category.slug.toLowerCase();
		if (seen.has(key)) {
			ctx.addIssue({
				code: 'custom',
				message: `duplikat slugu kategorii «${category.slug}»`,
				path: [index, 'slug'],
			});
			return;
		}
		seen.add(key);
	});
}

const zonesSchema = z.object(
	Object.fromEntries(LAYOUT_ZONE_ORDER.map((zone) => [zone, layoutZoneSectionSchema])) as Record<
		(typeof LAYOUT_ZONE_ORDER)[number],
		typeof layoutZoneSectionSchema
	>,
);

export const layoutFileSchema = z
	.object({
		categories: z.array(categorySchema).superRefine(uniqueCategorySlugs),
		displays: z.record(z.string(), z.array(z.string())),
		zones: zonesSchema,
	})
	.strict();

export type LayoutFilePayload = z.infer<typeof layoutFileSchema>;

export function parseLayoutFilePayload(json: string): LayoutFilePayload {
	return layoutFileSchema.parse(JSON.parse(json));
}

export function assertLayoutComponentIds(payload: LayoutFilePayload): void {
	const allowed = new Set<string>(LAYOUT_COMPONENT_IDS);
	for (const zone of LAYOUT_ZONE_ORDER) {
		for (const slot of payload.zones[zone].components) {
			if (!allowed.has(slot.component)) {
				throw new Error(`Nieznany component w strefie ${zone}: ${slot.component}`);
			}
		}
	}
}

/** Walidacja schematu + whitelisty ID komponentów. */
export function assertLayoutFileContract(json: string): LayoutFilePayload {
	const payload = parseLayoutFilePayload(json);
	assertLayoutComponentIds(payload);
	return payload;
}
