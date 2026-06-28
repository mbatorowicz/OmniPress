import { sha256HexPrefix } from '@/lib/crypto/sha256-hex';
import {
	buildLayoutFilePayload,
	parseLayoutFile,
	parseNavigationJson,
} from './parse';
import type { DraftLiveScope, DraftLiveStatus, LayoutSyncScope } from './layout-sync-meta';
import type { LayoutSyncMeta, SiteAstroLayout } from './types';
import { normalizeLayoutSlots } from './migrate-layout';

function hashPayload(content: string): string {
	return sha256HexPrefix(content, 16);
}

export function hashLayoutFile(layout: SiteAstroLayout): string {
	return hashPayload(buildLayoutFilePayload(normalizeLayoutSlots(layout)));
}

/** @deprecated */
export function hashNavigationLayout(navigation: SiteAstroLayout['navigation']): string {
	return hashPayload(JSON.stringify(navigation));
}

/** @deprecated */
export function hashCategoriesLayout(layout: SiteAstroLayout): string {
	return hashLayoutFile(layout);
}

export function hashLayoutFileText(text: string): string | null {
	if (!text.trim()) return null;
	try {
		const parsed = parseLayoutFile(text);
		return hashPayload(
			buildLayoutFilePayload({
				categories: parsed.categories,
				categoryDisplays: parsed.displays,
				slots: parsed.slots,
				navigation: [],
				layoutPath: '',
				navigationPath: '',
				categoriesPath: '',
			}),
		);
	} catch {
		return null;
	}
}

/** @deprecated */
export function hashNavigationFileText(text: string): string | null {
	if (!text.trim()) return null;
	try {
		return hashPayload(JSON.stringify(parseNavigationJson(text)));
	} catch {
		return null;
	}
}

/** @deprecated */
export function hashCategoriesFileText(text: string): string | null {
	return hashLayoutFileText(text);
}

export function withPublishedMeta(
	layout: SiteAstroLayout,
	options: {
		commitSha: string;
		scope: LayoutSyncScope;
	},
): SiteAstroLayout {
	const now = new Date().toISOString();
	const layoutHash = hashLayoutFile(layout);
	const sync: LayoutSyncMeta = {
		...layout.sync,
		lastPublishedAt: now,
		lastPublishedSha: options.commitSha.slice(0, 7),
		publishedLayoutHash: layoutHash,
		publishedNavHash: layoutHash,
		publishedCategoriesHash: layoutHash,
	};

	return { ...layout, sync };
}

export function withImportedLiveMeta(
	layout: SiteAstroLayout,
	options: { layoutHash?: string | null; navHash?: string | null; categoriesHash?: string | null },
): SiteAstroLayout {
	const hash = options.layoutHash ?? options.navHash ?? options.categoriesHash;
	const sync: LayoutSyncMeta = { ...layout.sync };
	if (hash) {
		sync.publishedLayoutHash = hash;
		sync.publishedNavHash = hash;
		sync.publishedCategoriesHash = hash;
	}
	return { ...layout, sync };
}

export function computeDraftLiveStatus(
	layout: SiteAstroLayout,
	scope: DraftLiveScope,
	liveHashes?: { layoutHash?: string | null; navHash?: string | null; categoriesHash?: string | null },
): DraftLiveStatus {
	const draftHash = hashLayoutFile(layout);
	const liveHash =
		liveHashes?.layoutHash ??
		liveHashes?.navHash ??
		liveHashes?.categoriesHash ??
		layout.sync?.publishedLayoutHash ??
		layout.sync?.publishedCategoriesHash ??
		layout.sync?.publishedNavHash;

	if (!liveHash) return 'unknown';
	return draftHash === liveHash ? 'in_sync' : 'draft_ahead';
}

export type CombinedDraftLiveStatus = {
	combined: DraftLiveStatus;
	nav: DraftLiveStatus;
	categories: DraftLiveStatus;
};

export function computeCombinedDraftLiveStatus(
	layout: SiteAstroLayout,
	liveHashes?: { layoutHash?: string | null; navHash?: string | null; categoriesHash?: string | null },
): CombinedDraftLiveStatus {
	const status = computeDraftLiveStatus(layout, 'categories', liveHashes);
	return { combined: status, nav: status, categories: status };
}
