import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
	getGitHubFile,
	getGitHubFileText,
	parseGitHubRepoConfig,
	putGitHubFile,
} from '@/lib/publish/github-api';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import { normalizeSiteAstroLayout } from './parse';
import { syncCertAdvisoriesOnGitHub } from '@/lib/cert/github';
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
		layout.widgets = parsed.widgets;
	}

	await saveSiteAstroLayout(supabase, siteId, layout);
	return { ok: true, layout };
}

export async function syncSiteAstroLayoutToGitHub(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
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

	const existingNav = await getGitHubFile(cfg, creds.token, navPath);
	await putGitHubFile(
		cfg,
		creds.token,
		navPath,
		buildNavigationFilePayload(layout.navigation),
		'OmniPress: aktualizacja menu',
		existingNav?.sha,
	);

	const existingCat = await getGitHubFile(cfg, creds.token, catPath);
	await putGitHubFile(
		cfg,
		creds.token,
		catPath,
		buildCategoriesFilePayload(layout),
		'OmniPress: kategorie i przypisanie do komponentów',
		existingCat?.sha,
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
		const cert = await syncCertAdvisoriesOnGitHub(
			cfg,
			creds.token,
			dest.config,
			layout.widgets.cert_advisories,
		);
		if (cert.ok && cert.count > 0) {
			certSummary = `, ${cert.count} komunikatów CERT`;
		}
	} catch {
		// Sync CERT nie blokuje layoutu
	}

	return {
		ok: true,
		summary: `Zapisano ${navPath} i ${catPath} w ${cfg.owner}/${cfg.repo}${certSummary}`,
	};
}
