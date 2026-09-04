import {
	resolveNavEditorDepthColors,
	type NavEditorDepthColors,
} from '@/lib/admin/nav-editor-colors';
import { normalizeCategoryDefinition } from './category-archive';
import { normalizeLayoutSlots } from './migrate-layout';
import { parseSlots } from './parse-layout-file';
import { normalizeNavItems } from './parse-nav';
import { mergeCategoryDisplays } from './slots';
import type { CategoryDefinition, SiteAstroLayout } from './types';
import {
	DEFAULT_CATEGORIES_PATH,
	DEFAULT_LAYOUT_PATH,
	DEFAULT_NAVIGATION_PATH,
	emptySiteAstroLayout,
} from './types';
import { flattenSlots, parseZonesFromFile } from './zones';

function parseNavEditorDepthColorsRaw(raw: unknown): NavEditorDepthColors | undefined {
	if (!Array.isArray(raw) || raw.length < 3) return undefined;
	const parsed = raw.slice(0, 3).map((item) => {
		if (!item || typeof item !== 'object') return null;
		return item as Record<string, unknown>;
	});
	if (parsed.some((item) => item === null)) return undefined;
	return resolveNavEditorDepthColors(parsed as NavEditorDepthColors);
}

export function normalizeSiteAstroLayout(raw: unknown): SiteAstroLayout {
	if (!raw || typeof raw !== 'object') return emptySiteAstroLayout();
	const o = raw as Partial<SiteAstroLayout> & { zones?: unknown; slots?: unknown };
	const legacySlots = parseSlots(o.slots);
	const zones = parseZonesFromFile(o, legacySlots);
	const slots = flattenSlots(zones);
	const syncRaw = o.sync;
	const sync =
		syncRaw && typeof syncRaw === 'object'
			? {
					lastDraftSavedAt:
						typeof syncRaw.lastDraftSavedAt === 'string'
							? syncRaw.lastDraftSavedAt
							: undefined,
					lastPublishedAt:
						typeof syncRaw.lastPublishedAt === 'string' ? syncRaw.lastPublishedAt : undefined,
					lastPublishedSha:
						typeof syncRaw.lastPublishedSha === 'string'
							? syncRaw.lastPublishedSha
							: undefined,
					publishedNavHash:
						typeof syncRaw.publishedNavHash === 'string'
							? syncRaw.publishedNavHash
							: undefined,
					publishedCategoriesHash:
						typeof syncRaw.publishedCategoriesHash === 'string'
							? syncRaw.publishedCategoriesHash
							: undefined,
					publishedLayoutHash:
						typeof syncRaw.publishedLayoutHash === 'string'
							? syncRaw.publishedLayoutHash
							: undefined,
					publishedLiveBlobSha:
						typeof syncRaw.publishedLiveBlobSha === 'string'
							? syncRaw.publishedLiveBlobSha
							: undefined,
					layoutContract:
						syncRaw.layoutContract === 'zones_v2' ||
						syncRaw.layoutContract === 'legacy' ||
						syncRaw.layoutContract === 'unified'
							? syncRaw.layoutContract
							: zones && !o.slots
								? 'zones_v2'
								: undefined,
				}
			: undefined;

	const layoutPath = o.layoutPath?.trim() || o.categoriesPath?.trim() || DEFAULT_LAYOUT_PATH;

	let layout: SiteAstroLayout = {
		navigation: normalizeNavItems(o.navigation),
		categoryDisplays: mergeCategoryDisplays(slots, o.categoryDisplays ?? {}),
		categories: Array.isArray(o.categories)
			? o.categories
					.map(normalizeCategoryDefinition)
					.filter((c): c is CategoryDefinition => c !== null)
			: [],
		zones,
		slots,
		layoutPath,
		navigationPath: o.navigationPath?.trim() || DEFAULT_NAVIGATION_PATH,
		categoriesPath: o.categoriesPath?.trim() || DEFAULT_CATEGORIES_PATH,
		navEditorDepthColors: parseNavEditorDepthColorsRaw(o.navEditorDepthColors),
		sync,
	};

	layout = normalizeLayoutSlots(layout);
	layout.categoryDisplays = mergeCategoryDisplays(layout.slots, layout.categoryDisplays);
	layout.sync = { ...layout.sync, layoutContract: 'zones_v2' };
	return layout;
}
