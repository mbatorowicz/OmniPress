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
): Promise<{ ok: true } | { ok: false; error: string }> {
	const { error } = await supabase
		.from('sites')
		.update({ astro_layout: layout })
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

	const layout = emptySiteAstroLayout();
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

	await saveSiteAstroLayout(supabase, siteId, layout);
	return { ok: true, layout };
}

export type LayoutGitHubSyncResult =
	| { ok: true; summary: string }
	| { ok: false; error: string; detail?: string };

const LAYOUT_SYNC_COMMIT_MESSAGE = 'OmniPress: sync layoutu Astro';

export async function syncSiteAstroLayoutToGitHub(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<LayoutGitHubSyncResult> {
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
		const files: GitHubTextFileWrite[] = [
			{ path: navPath, content: buildNavigationFilePayload(layout.navigation) },
			{ path: catPath, content: buildCategoriesFilePayload(layout) },
		];

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

		const { commitSha, written } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			files,
			LAYOUT_SYNC_COMMIT_MESSAGE,
		);

		const githubSummary = `1 commit (${written} plików): ${navPath}, ${catPath} w ${cfg.owner}/${cfg.repo}`;

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
			return { ok: true, summary: `${githubSummary} | ${vercel.summary}` };
		}

		return { ok: true, summary: githubSummary };
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'sync_failed';
		return { ok: false, error: 'sync_failed', detail: detail.slice(0, 300) };
	}
}
