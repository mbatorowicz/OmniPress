import type { SupabaseClient } from '@supabase/supabase-js';
import { categoriesConfigPath, layoutConfigPath, navigationConfigPath } from '@/lib/admin/config-paths';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
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
	hashLayoutFileText,
	hashNavigationFileText,
	withImportedLiveMeta,
	withPublishedMeta,
} from './layout-sync-meta.server';
import { mergeLegacyLayoutParts, syncNavigationInLayout } from './migrate-layout';
import { buildLayoutRecentChangeEntry } from '@/lib/recent-changes/layout-entry';
import { parseRecentChangesFile } from '@/lib/recent-changes/parse';
import { recentChangesPath } from '@/lib/recent-changes/types';
import { upsertRecentChange } from '@/lib/recent-changes/upsert';
import type { SiteAstroLayout } from './types';
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
): Promise<{ layout: SiteAstroLayout; layoutHash: string } | { error: string }> {
	const navPath = navigationConfigPath(destConfig);
	const catPath = categoriesConfigPath(destConfig);
	const layoutPath = layoutConfigPath(destConfig);

	const layoutText = await getGitHubFileText(cfg, token, layoutPath);
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
			return { layout: normalized, layoutHash: hash };
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
	return { layout: normalized, layoutHash: hash };
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
	| { ok: true; summary: string; commitSha: string }
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
		const files: GitHubTextFileWrite[] = [
			{ path: layoutPath, content: buildLayoutFilePayload(publishLayout) },
		];

		const { commitSha, written } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			files,
			LAYOUT_SYNC_COMMIT_MESSAGES[scope],
		);

		const writtenPaths = files.map((f) => f.path).join(', ');
		const githubSummary = `1 commit (${written} plików): ${writtenPaths} w ${cfg.owner}/${cfg.repo} | Vercel zbuduje stronę automatycznie (webhook).`;

		const publishedLayout = withPublishedMeta(publishLayout, { commitSha, scope: 'layout' });
		await saveSiteAstroLayout(supabase, siteId, publishedLayout, { updateDraftMeta: false });

		return { ok: true, summary: githubSummary, commitSha };
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
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
		const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
		if (layoutText) {
			const parsed = parseLayoutFile(layoutText);
			const navSlot = parsed.slots.find((s) => s.component === 'header.navigation');
			const navigation = navSlot?.widget?.navigation ?? [];
			return collectNavHrefs(navigation).length;
		}

		const navText = await getGitHubFileText(cfg, creds.token, layout.navigationPath);
		if (!navText) return null;
		return collectNavHrefs(parseNavigationJson(navText)).length;
	} catch {
		return null;
	}
}

export async function fetchLiveLayoutHashes(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<{ layoutHash?: string; navHash?: string; categoriesHash?: string } | null> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
		const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
		if (layoutText) {
			const hash = hashLayoutFileText(layoutText) ?? undefined;
			return { layoutHash: hash, navHash: hash, categoriesHash: hash };
		}

		const [navText, catText] = await Promise.all([
			getGitHubFileText(cfg, creds.token, layout.navigationPath),
			getGitHubFileText(cfg, creds.token, layout.categoriesPath),
		]);

		const navHash = navText ? (hashNavigationFileText(navText) ?? undefined) : undefined;
		const catHash = catText ? (hashLayoutFileText(catText) ?? undefined) : undefined;
		const layoutHash = catHash ?? navHash;
		return { layoutHash, navHash, categoriesHash: catHash };
	} catch {
		return null;
	}
}
