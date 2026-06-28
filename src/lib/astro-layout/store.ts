import type { SupabaseClient } from '@supabase/supabase-js';
import { categoriesConfigPath, layoutConfigPath, navigationConfigPath } from '@/lib/admin/config-paths';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
	getGitHubFileBlobSha,
	getGitHubFileText,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	type GitHubTextFileWrite,
} from '@/lib/publish/github-api';
import {
	buildLayoutFilePayload,
	parseCategoriesFile,
	parseLayoutFile,
	parseNavigationJson,
	normalizeSiteAstroLayout,
} from './parse';
import {
	withDraftSavedMeta,
	type LayoutSyncScope,
} from './layout-sync-meta';
import {
	hashLayoutFile,
	hashLayoutFileText,
	hashNavigationFileText,
	withImportedLiveMeta,
	withPublishedMeta,
	type LiveLayoutFingerprint,
} from './layout-sync-meta.server';
import { getNavigationFromLayout, mergeLegacyLayoutParts, syncNavigationInLayout } from './migrate-layout';
import { buildLayoutRecentChangeEntry } from '@/lib/recent-changes/layout-entry';
import { parseRecentChangesFile } from '@/lib/recent-changes/parse';
import { recentChangesPath } from '@/lib/recent-changes/types';
import { upsertRecentChange } from '@/lib/recent-changes/upsert';
import type { LayoutContract, SiteAstroLayout } from './types';
import { emptySiteAstroLayout } from './types';
import { collectNavHrefs } from './validate-nav';

export type LayoutImportReport = {
	hrefCount: number;
	layoutPath: string;
	layoutHash: string;
	/** @deprecated */
	navigationPath: string;
	/** @deprecated */
	navHash: string;
};

export type LayoutImportResult =
	| { ok: true; layout: SiteAstroLayout; report: LayoutImportReport }
	| { ok: false; error: string };

export async function loadSiteAstroLayout(
	supabase: SupabaseClient,
	siteId: string,
): Promise<SiteAstroLayout> {
	const { data } = await supabase
		.from('sites')
		.select('astro_layout')
		.eq('id', siteId)
		.maybeSingle();

	if (data?.astro_layout) {
		return normalizeSiteAstroLayout(data.astro_layout);
	}

	return emptySiteAstroLayout();
}

export async function saveSiteAstroLayout(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
	options: { updateDraftMeta?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
	const payload = options.updateDraftMeta === false ? layout : withDraftSavedMeta(layout);
	const { error } = await supabase
		.from('sites')
		.update({ astro_layout: payload })
		.eq('id', siteId);

	if (error) return { ok: false, error: 'save_failed' };
	return { ok: true };
}

async function importLegacyLayoutFromGitHub(
	cfg: Parameters<typeof getGitHubFileText>[0],
	token: string,
	destConfig: Record<string, unknown>,
	layout: SiteAstroLayout,
): Promise<
	| { layout: SiteAstroLayout; layoutHash: string; liveBlobSha?: string; layoutContract: LayoutContract }
	| { error: string }
> {
	const navPath = navigationConfigPath(destConfig);
	const catPath = categoriesConfigPath(destConfig);
	const layoutPath = layoutConfigPath(destConfig);

	const layoutBlobSha = await getGitHubFileBlobSha(cfg, token, layoutPath);
	const layoutText = layoutBlobSha ? await getGitHubFileText(cfg, token, layoutPath) : null;
	if (layoutText) {
		try {
			const parsed = parseLayoutFile(layoutText);
			const merged: SiteAstroLayout = {
				...layout,
				categories: parsed.categories,
				categoryDisplays: parsed.displays,
				slots: parsed.slots,
				layoutPath,
			};
			const normalized = normalizeSiteAstroLayout(merged);
			const hash = hashLayoutFileText(layoutText) ?? '';
			return {
				layout: normalized,
				layoutHash: hash,
				liveBlobSha: layoutBlobSha ?? undefined,
				layoutContract: 'unified',
			};
		} catch {
			return { error: 'invalid_layout' };
		}
	}

	const navText = await getGitHubFileText(cfg, token, navPath);
	if (!navText) return { error: 'import_nav_missing' };

	let navigation;
	try {
		navigation = parseNavigationJson(navText);
	} catch {
		return { error: 'invalid_navigation' };
	}

	const hrefCount = collectNavHrefs(navigation).length;
	if (hrefCount === 0 && navText.includes('"href"')) {
		return { error: 'import_nav_empty' };
	}

	let categories = layout.categories;
	let displays = layout.categoryDisplays;
	let slots = layout.slots;

	const catText = await getGitHubFileText(cfg, token, catPath);
	if (catText) {
		try {
			const parsed = parseCategoriesFile(catText);
			categories = parsed.categories;
			displays = parsed.displays;
			slots = parsed.slots;
		} catch {
			return { error: 'invalid_layout' };
		}
	}

	let recentEntries = undefined;
	const rcText = await getGitHubFileText(cfg, token, recentChangesPath(destConfig));
	if (rcText) {
		try {
			recentEntries = parseRecentChangesFile(rcText).entries;
		} catch {
			// ignore broken recent changes file
		}
	}

	slots = mergeLegacyLayoutParts({
		categories,
		displays,
		slots,
		navigation,
		recentEntries,
	});

	const merged = syncNavigationInLayout(
		{
			...layout,
			categories,
			categoryDisplays: displays,
			slots,
			navigation,
			layoutPath,
		},
		navigation,
	);

	const normalized = normalizeSiteAstroLayout(merged);
	const hash = hashLayoutFileText(buildLayoutFilePayload(normalized)) ?? '';
	return { layout: normalized, layoutHash: hash, layoutContract: 'legacy' };
}

export async function importSiteAstroLayoutFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<LayoutImportResult> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const existing = await loadSiteAstroLayout(supabase, siteId);
	const layout: SiteAstroLayout = { ...existing };
	layout.layoutPath = layoutConfigPath(dest.config);
	layout.navigationPath = navigationConfigPath(dest.config);
	layout.categoriesPath = categoriesConfigPath(dest.config);

	const imported = await importLegacyLayoutFromGitHub(cfg, creds.token, dest.config, layout);
	if ('error' in imported) return { ok: false, error: imported.error };

	const merged = withImportedLiveMeta(imported.layout, {
		layoutHash: imported.layoutHash || null,
		liveBlobSha: imported.liveBlobSha ?? null,
		layoutContract: imported.layoutContract,
	});

	const saved = await saveSiteAstroLayout(supabase, siteId, merged, { updateDraftMeta: false });
	if (!saved.ok) return { ok: false, error: 'save_failed' };

	const persisted = await loadSiteAstroLayout(supabase, siteId);
	const persistedHrefCount = collectNavHrefs(persisted.navigation).length;

	return {
		ok: true,
		layout: persisted,
		report: {
			hrefCount: persistedHrefCount,
			layoutPath: layout.layoutPath,
			layoutHash: imported.layoutHash,
			navigationPath: layout.navigationPath,
			navHash: imported.layoutHash,
		},
	};
}

export type LayoutGitHubSyncOptions = {
	scope?: LayoutSyncScope;
	includeRecentChanges?: boolean;
};

export type LayoutGitHubSyncResult =
	| { ok: true; summary: string; commitSha: string; skipped?: false }
	| { ok: true; summary: string; skipped: true }
	| { ok: false; error: string; detail?: string };

const LAYOUT_SYNC_COMMIT_MESSAGES: Record<LayoutSyncScope, string> = {
	layout: 'OmniPress: publikacja layoutu',
	all: 'OmniPress: publikacja layoutu',
	navigation: 'OmniPress: publikacja layoutu',
	categories: 'OmniPress: publikacja layoutu',
};

export async function syncSiteAstroLayoutToGitHub(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
	options: LayoutGitHubSyncOptions = {},
): Promise<LayoutGitHubSyncResult> {
	const scope = options.scope ?? 'all';
	const includeRecentChanges =
		options.includeRecentChanges ?? (scope === 'all' || scope === 'layout');

	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
	let publishLayout = syncNavigationInLayout(layout, layout.navigation);

	if (includeRecentChanges) {
		try {
			const entry = buildLayoutRecentChangeEntry();
			const rcSlot = publishLayout.slots.find((s) => s.component === 'sidebar.recent_changes');
			const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);
			publishLayout = {
				...publishLayout,
				slots: publishLayout.slots.map((slot) =>
					slot.component === 'sidebar.recent_changes' ? { ...slot, entries } : slot,
				),
			};
		} catch {
			// Rejestr zmian nie blokuje sync layoutu
		}
	}

	try {
		const content = buildLayoutFilePayload(publishLayout);
		const publishHash = hashLayoutFile(publishLayout);

		const storedHash = layout.sync?.publishedLayoutHash;
		if (storedHash && publishHash === storedHash) {
			const liveBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layoutPath);
			if (
				liveBlobSha &&
				layout.sync?.publishedLiveBlobSha &&
				liveBlobSha === layout.sync.publishedLiveBlobSha
			) {
				return {
					ok: true,
					skipped: true,
					summary: 'Layout bez zmian względem strony — pominięto commit na GitHub.',
				};
			}
		}

		const files: GitHubTextFileWrite[] = [{ path: layoutPath, content }];

		const { commitSha, written, blobShas } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			files,
			LAYOUT_SYNC_COMMIT_MESSAGES[scope],
		);

		const writtenPaths = files.map((f) => f.path).join(', ');
		const githubSummary = `1 commit (${written} plików): ${writtenPaths} w ${cfg.owner}/${cfg.repo} | Vercel zbuduje stronę automatycznie (webhook).`;

		const publishedLayout = withPublishedMeta(publishLayout, {
			commitSha,
			scope: 'layout',
			liveBlobSha: blobShas[layoutPath],
			layoutContract: 'unified',
		});
		await saveSiteAstroLayout(supabase, siteId, publishedLayout, { updateDraftMeta: false });

		return { ok: true, summary: githubSummary, commitSha, skipped: false };
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'sync_failed';
		return { ok: false, error: 'sync_failed', detail: detail.slice(0, 300) };
	}
}

export async function fetchLiveNavigationHrefCount(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<number | null> {
	const draftHash = hashLayoutFile(layout);
	if (
		layout.sync?.publishedLayoutHash &&
		draftHash === layout.sync.publishedLayoutHash
	) {
		return countNavigationHrefs(getNavigationFromLayout(layout));
	}

	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
		const layoutBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layoutPath);
		if (layoutBlobSha) {
			const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
			if (layoutText) {
				const parsed = parseLayoutFile(layoutText);
				const navSlot = parsed.slots.find((s) => s.component === 'header.navigation');
				const navigation = navSlot?.widget?.navigation ?? [];
				return collectNavHrefs(navigation).length;
			}
		}

		const navText = await getGitHubFileText(cfg, creds.token, layout.navigationPath);
		if (!navText) return null;
		return collectNavHrefs(parseNavigationJson(navText)).length;
	} catch {
		return null;
	}
}

export async function fetchLiveLayoutFingerprint(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<LiveLayoutFingerprint | null> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
		const layoutBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layoutPath);

		if (layoutBlobSha) {
			const draftHash = hashLayoutFile(layout);
			const publishedHash = layout.sync?.publishedLayoutHash;
			const storedBlob = layout.sync?.publishedLiveBlobSha;
			const needsContent =
				!publishedHash ||
				draftHash !== publishedHash ||
				!storedBlob ||
				layoutBlobSha !== storedBlob;

			let layoutHash: string | undefined;
			if (needsContent) {
				const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
				layoutHash = layoutText ? (hashLayoutFileText(layoutText) ?? undefined) : undefined;
			} else {
				layoutHash = publishedHash;
			}

			return {
				layoutHash,
				blobSha: layoutBlobSha,
				layoutContract: 'unified',
			};
		}

		const catBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layout.categoriesPath);
		if (!catBlobSha) return null;

		const [navText, catText] = await Promise.all([
			getGitHubFileText(cfg, creds.token, layout.navigationPath),
			getGitHubFileText(cfg, creds.token, layout.categoriesPath),
		]);

		const navHash = navText ? (hashNavigationFileText(navText) ?? undefined) : undefined;
		const catHash = catText ? (hashLayoutFileText(catText) ?? undefined) : undefined;
		return {
			layoutHash: catHash ?? navHash,
			blobSha: catBlobSha,
			layoutContract: 'legacy',
		};
	} catch {
		return null;
	}
}

/** @deprecated użyj fetchLiveLayoutFingerprint */
export async function fetchLiveLayoutHashes(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<{ layoutHash?: string; navHash?: string; categoriesHash?: string } | null> {
	const fp = await fetchLiveLayoutFingerprint(supabase, siteId, layout);
	if (!fp?.layoutHash) return fp ? { layoutHash: fp.layoutHash, navHash: fp.layoutHash, categoriesHash: fp.layoutHash } : null;
	const hash = fp.layoutHash;
	return { layoutHash: hash, navHash: hash, categoriesHash: hash };
}
