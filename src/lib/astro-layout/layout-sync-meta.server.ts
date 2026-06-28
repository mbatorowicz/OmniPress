import { sha256HexPrefix } from '@/lib/crypto/sha256-hex';
import {
	buildLayoutFilePayload,
	parseLayoutFile,
	parseNavigationJson,
} from './parse';
import type { DraftLiveScope, DraftLiveStatus, LayoutSyncScope } from './layout-sync-meta';
import type { LayoutContract, LayoutSyncMeta, SiteAstroLayout } from './types';
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
		liveBlobSha?: string;
		layoutContract?: LayoutContract;
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
		publishedLiveBlobSha: options.liveBlobSha ?? layout.sync?.publishedLiveBlobSha,
		layoutContract: options.layoutContract ?? layout.sync?.layoutContract ?? 'unified',
	};

	return { ...layout, sync };
}

export function withImportedLiveMeta(
	layout: SiteAstroLayout,
	options: {
		layoutHash?: string | null;
		navHash?: string | null;
		categoriesHash?: string | null;
		liveBlobSha?: string | null;
		layoutContract?: LayoutContract;
	},
): SiteAstroLayout {
	const hash = options.layoutHash ?? options.navHash ?? options.categoriesHash;
	const sync: LayoutSyncMeta = { ...layout.sync };
	if (hash) {
		sync.publishedLayoutHash = hash;
		sync.publishedNavHash = hash;
		sync.publishedCategoriesHash = hash;
	}
	if (options.liveBlobSha) sync.publishedLiveBlobSha = options.liveBlobSha;
	if (options.layoutContract) sync.layoutContract = options.layoutContract;
	return { ...layout, sync };
}

export type LiveLayoutFingerprint = {
	layoutHash?: string;
	blobSha?: string;
	layoutContract: LayoutContract;
};

/** Ustal status sync bez pobierania GitHub, gdy szkic ≠ ostatnia publikacja. */
export function resolveDraftLiveStatus(
	layout: SiteAstroLayout,
	live?: LiveLayoutFingerprint | null,
): DraftLiveStatus {
	const draftHash = hashLayoutFile(layout);
	const publishedHash = layout.sync?.publishedLayoutHash;

	if (!publishedHash) {
		if (live?.layoutHash) {
			return draftHash === live.layoutHash ? 'in_sync' : 'draft_ahead';
		}
		return 'unknown';
	}

	if (draftHash !== publishedHash) return 'draft_ahead';

	if (!live) return 'in_sync';

	const storedBlob = layout.sync?.publishedLiveBlobSha;
	if (live.blobSha && storedBlob && live.blobSha !== storedBlob) {
		if (live.layoutHash && live.layoutHash !== draftHash) return 'live_ahead';
	}

	if (live.layoutHash) {
		return live.layoutHash === draftHash ? 'in_sync' : 'live_ahead';
	}

	return 'in_sync';
}

export function computeDraftLiveStatus(
	layout: SiteAstroLayout,
	_scope: DraftLiveScope,
	liveHashes?: { layoutHash?: string | null; navHash?: string | null; categoriesHash?: string | null },
): DraftLiveStatus {
	const live: LiveLayoutFingerprint | null = liveHashes
		? {
				layoutHash:
					liveHashes.layoutHash ?? liveHashes.navHash ?? liveHashes.categoriesHash ?? undefined,
				layoutContract: layout.sync?.layoutContract ?? 'unified',
			}
		: null;
	return resolveDraftLiveStatus(layout, live);
}

export type CombinedDraftLiveStatus = {
	combined: DraftLiveStatus;
	nav: DraftLiveStatus;
	categories: DraftLiveStatus;
};

export function computeCombinedDraftLiveStatus(
	layout: SiteAstroLayout,
	live?: LiveLayoutFingerprint | null,
): CombinedDraftLiveStatus {
	const status = resolveDraftLiveStatus(layout, live);
	return { combined: status, nav: status, categories: status };
}
