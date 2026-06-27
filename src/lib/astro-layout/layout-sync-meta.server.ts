import { sha256HexPrefix } from '@/lib/crypto/sha256-hex';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import type { DraftLiveScope, DraftLiveStatus, LayoutSyncScope } from './layout-sync-meta';
import type { LayoutSyncMeta, SiteAstroLayout } from './types';

function hashPayload(content: string): string {
	return sha256HexPrefix(content, 16);
}

export function hashNavigationLayout(navigation: SiteAstroLayout['navigation']): string {
	return hashPayload(buildNavigationFilePayload(navigation));
}

export function hashCategoriesLayout(layout: SiteAstroLayout): string {
	return hashPayload(buildCategoriesFilePayload(layout));
}

export function hashNavigationFileText(text: string): string | null {
	if (!text.trim()) return null;
	try {
		return hashNavigationLayout(parseNavigationJson(text));
	} catch {
		return null;
	}
}

export function hashCategoriesFileText(text: string): string | null {
	if (!text.trim()) return null;
	try {
		const parsed = parseCategoriesFile(text);
		return hashPayload(
			buildCategoriesFilePayload({
				categories: parsed.categories,
				categoryDisplays: parsed.displays,
				slots: parsed.slots,
				navigation: [],
				navigationPath: '',
				categoriesPath: '',
			}),
		);
	} catch {
		return null;
	}
}

export function withPublishedMeta(
	layout: SiteAstroLayout,
	options: {
		commitSha: string;
		scope: LayoutSyncScope;
	},
): SiteAstroLayout {
	const now = new Date().toISOString();
	const sync: LayoutSyncMeta = {
		...layout.sync,
		lastPublishedAt: now,
		lastPublishedSha: options.commitSha.slice(0, 7),
	};

	if (options.scope === 'navigation' || options.scope === 'all') {
		sync.publishedNavHash = hashNavigationLayout(layout.navigation);
	}
	if (options.scope === 'categories' || options.scope === 'all') {
		sync.publishedCategoriesHash = hashCategoriesLayout(layout);
	}

	return { ...layout, sync };
}

export function withImportedLiveMeta(
	layout: SiteAstroLayout,
	options: { navHash?: string | null; categoriesHash?: string | null },
): SiteAstroLayout {
	const sync: LayoutSyncMeta = { ...layout.sync };
	if (options.navHash) sync.publishedNavHash = options.navHash;
	if (options.categoriesHash) sync.publishedCategoriesHash = options.categoriesHash;
	return { ...layout, sync };
}

export function computeDraftLiveStatus(
	layout: SiteAstroLayout,
	scope: DraftLiveScope,
	liveHashes?: { navHash?: string | null; categoriesHash?: string | null },
): DraftLiveStatus {
	const draftNav = hashNavigationLayout(layout.navigation);
	const draftCat = hashCategoriesLayout(layout);

	const liveNav = liveHashes?.navHash ?? layout.sync?.publishedNavHash;
	const liveCat = liveHashes?.categoriesHash ?? layout.sync?.publishedCategoriesHash;

	if (scope === 'navigation') {
		if (!liveNav) return 'unknown';
		return draftNav === liveNav ? 'in_sync' : 'draft_ahead';
	}

	if (!liveCat) return 'unknown';
	return draftCat === liveCat ? 'in_sync' : 'draft_ahead';
}
