import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	resolveVercelTokenForDestination,
} from '@/lib/publish/credentials';
import {
	getGitHubFile,
	getGitHubFileText,
	parseGitHubRepoConfig,
	putGitHubFile,
	type GitHubConfig,
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
import { syncCertAdvisoriesOnGitHub } from '@/lib/cert/github';
import { syncWeatherWarningsOnGitHub } from '@/lib/weather/github';
import { findSlotByComponent } from './slots';
import { findWeatherSlot } from '@/lib/weather/filter';
import { appendRecentChangeOnGitHub } from '@/lib/recent-changes/github';
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

async function putGitHubTextFile(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
	content: string,
	message: string,
): Promise<string> {
	const existing = await getGitHubFile(cfg, token, filePath);
	try {
		const result = await putGitHubFile(cfg, token, filePath, content, message, existing?.sha);
		return result.commitSha;
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		if (!msg.includes('409')) throw err;
		const fresh = await getGitHubFile(cfg, token, filePath);
		const result = await putGitHubFile(cfg, token, filePath, content, message, fresh?.sha);
		return result.commitSha;
	}
}

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
		let lastCommitSha = await putGitHubTextFile(
			cfg,
			creds.token,
			navPath,
			buildNavigationFilePayload(layout.navigation),
			'OmniPress: aktualizacja menu',
		);

		lastCommitSha = await putGitHubTextFile(
			cfg,
			creds.token,
			catPath,
			buildCategoriesFilePayload(layout),
			'OmniPress: kategorie i przypisanie do komponentów',
		);

		try {
			await appendRecentChangeOnGitHub(
				cfg,
				creds.token,
				dest.config,
				buildLayoutRecentChangeEntry(),
			);
		} catch {
			// Rejestr zmian nie blokuje sync layoutu
		}

		let certSummary = '';
		try {
			const certSlot = findSlotByComponent(layout, 'sidebar.cert_advisories');
			const cert = await syncCertAdvisoriesOnGitHub(
				cfg,
				creds.token,
				dest.config,
				certSlot?.widget,
			);
			if (cert.ok && cert.count > 0) {
				certSummary = `, ${cert.count} komunikatów CERT`;
			}
			if (cert.ok && cert.commitSha) lastCommitSha = cert.commitSha;
		} catch {
			// Sync CERT nie blokuje layoutu
		}

		let weatherSummary = '';
		try {
			const weather = await syncWeatherWarningsOnGitHub(
				cfg,
				creds.token,
				dest.config,
				findWeatherSlot(layout),
			);
			if (weather.ok && weather.count > 0) {
				weatherSummary = `, ${weather.count} ostrzeżeń pogodowych`;
			}
			if (weather.ok && weather.commitSha) lastCommitSha = weather.commitSha;
		} catch {
			// Sync pogody nie blokuje layoutu
		}

		const githubSummary = `Zapisano ${navPath} i ${catPath} w ${cfg.owner}/${cfg.repo}${certSummary}${weatherSummary}`;

		const vercelCfg = parseVercelConfig(dest.config);
		const vercelToken = resolveVercelTokenForDestination(creds);
		if (vercelCfg && vercelToken) {
			const vercel = await waitForVercelBuild({
				cfg: vercelCfg,
				token: vercelToken,
				commitSha: lastCommitSha,
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
