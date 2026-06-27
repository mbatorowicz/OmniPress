import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	resolveVercelTokenForDestination,
} from '@/lib/publish/credentials';
import {
	getGitHubFileText,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	type GitHubTextFileWrite,
} from '@/lib/publish/github-api';
import { parseVercelConfig } from '@/lib/publish/vercel-api';
import { waitForVercelBuild } from '@/lib/publish/vercel-deploy';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import { normalizeSiteAstroLayout } from './parse';
import {
	hashCategoriesFileText,
	hashNavigationFileText,
	withDraftSavedMeta,
	withImportedLiveMeta,
	withPublishedMeta,
	type LayoutSyncScope,
} from './layout-sync-meta';
import { prepareRecentChangeAppendWrite } from '@/lib/recent-changes/github';
import { buildLayoutRecentChangeEntry } from '@/lib/recent-changes/layout-entry';
import type { SiteAstroLayout } from './types';
import { emptySiteAstroLayout } from './types';

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

export async function importSiteAstroLayoutFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ ok: true; layout: SiteAstroLayout } | { ok: false; error: string }> {
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
	layout.navigationPath =
		typeof dest.config.navigation_path === 'string' && dest.config.navigation_path.trim()
			? dest.config.navigation_path.trim()
			: layout.navigationPath;
	layout.categoriesPath =
		typeof dest.config.categories_path === 'string' && dest.config.categories_path.trim()
			? dest.config.categories_path.trim()
			: layout.categoriesPath;

	const navText = await getGitHubFileText(cfg, creds.token, layout.navigationPath);
	if (navText) {
		layout.navigation = parseNavigationJson(navText);
	}

	const catText = await getGitHubFileText(cfg, creds.token, layout.categoriesPath);
	if (catText) {
		const parsed = parseCategoriesFile(catText);
		layout.categories = parsed.categories;
		layout.categoryDisplays = parsed.displays;
		layout.slots = parsed.slots;
	}

	const merged = withImportedLiveMeta(layout, {
		navHash: navText ? hashNavigationFileText(navText) : null,
		categoriesHash: catText ? hashCategoriesFileText(catText) : null,
	});

	await saveSiteAstroLayout(supabase, siteId, merged, { updateDraftMeta: false });
	return { ok: true, layout: merged };
}

export type LayoutGitHubSyncOptions = {
	scope?: LayoutSyncScope;
	waitForVercel?: boolean;
	includeRecentChanges?: boolean;
};

export type LayoutGitHubSyncResult =
	| { ok: true; summary: string; commitSha: string }
	| { ok: false; error: string; detail?: string };

const LAYOUT_SYNC_COMMIT_MESSAGES: Record<LayoutSyncScope, string> = {
	navigation: 'OmniPress: publikacja menu',
	categories: 'OmniPress: publikacja kategorii i komponentów',
	all: 'OmniPress: publikacja layoutu',
};

export async function syncSiteAstroLayoutToGitHub(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
	options: LayoutGitHubSyncOptions = {},
): Promise<LayoutGitHubSyncResult> {
	const scope = options.scope ?? 'all';
	const waitForVercel = options.waitForVercel === true;
	const includeRecentChanges =
		options.includeRecentChanges ?? (scope === 'all');

	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const navPath = layout.navigationPath;
	const catPath = layout.categoriesPath;

	try {
		const files: GitHubTextFileWrite[] = [];

		if (scope === 'navigation' || scope === 'all') {
			files.push({ path: navPath, content: buildNavigationFilePayload(layout.navigation) });
		}
		if (scope === 'categories' || scope === 'all') {
			files.push({ path: catPath, content: buildCategoriesFilePayload(layout) });
		}

		if (files.length === 0) {
			return { ok: false, error: 'sync_failed', detail: 'Brak plików do publikacji.' };
		}

		if (includeRecentChanges) {
			try {
				const recent = await prepareRecentChangeAppendWrite(
					cfg,
					creds.token,
					dest.config,
					buildLayoutRecentChangeEntry(),
				);
				files.push(recent);
			} catch {
				// Rejestr zmian nie blokuje sync layoutu
			}
		}

		const { commitSha, written } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			files,
			LAYOUT_SYNC_COMMIT_MESSAGES[scope],
		);

		const writtenPaths = files.map((f) => f.path).join(', ');
		let githubSummary = `1 commit (${written} plików): ${writtenPaths} w ${cfg.owner}/${cfg.repo}`;

		if (waitForVercel) {
			const vercelCfg = parseVercelConfig(dest.config);
			const vercelToken = resolveVercelTokenForDestination(creds);
			if (vercelCfg && vercelToken) {
				const vercel = await waitForVercelBuild({
					cfg: vercelCfg,
					token: vercelToken,
					commitSha,
					maxWaitMs: 120_000,
				});
				if (!vercel.ok) {
					return {
						ok: false,
						error: 'vercel_build_failed',
						detail: `${githubSummary} | ${vercel.summary}`,
					};
				}
				githubSummary = `${githubSummary} | ${vercel.summary}`;
			}
		} else {
			githubSummary = `${githubSummary} | Vercel zbuduje stronę automatycznie (webhook).`;
		}

		const publishedLayout = withPublishedMeta(layout, { commitSha, scope });
		await saveSiteAstroLayout(supabase, siteId, publishedLayout, { updateDraftMeta: false });

		return { ok: true, summary: githubSummary, commitSha };
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'sync_failed';
		return { ok: false, error: 'sync_failed', detail: detail.slice(0, 300) };
	}
}

export async function fetchLiveLayoutHashes(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<{ navHash?: string; categoriesHash?: string } | null> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const [navText, catText] = await Promise.all([
			getGitHubFileText(cfg, creds.token, layout.navigationPath),
			getGitHubFileText(cfg, creds.token, layout.categoriesPath),
		]);

		return {
			navHash: navText ? (hashNavigationFileText(navText) ?? undefined) : undefined,
			categoriesHash: catText ? (hashCategoriesFileText(catText) ?? undefined) : undefined,
		};
	} catch {
		return null;
	}
}
