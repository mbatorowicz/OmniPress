import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteDestinations } from '@/lib/admin/sites';
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
import type { DestinationForPublish } from '@/lib/publish/types';
import {
	buildCategoriesFilePayload,
	buildNavigationFilePayload,
	parseCategoriesFile,
	parseNavigationJson,
} from './parse';
import { normalizeSiteAstroLayout } from './parse';
import type { SiteAstroLayout } from './types';
import { emptySiteAstroLayout } from './types';

async function loadAstroDestination(
	supabase: SupabaseClient,
	siteId: string,
): Promise<DestinationForPublish | null> {
	const links = await getSiteDestinations(supabase, siteId);
	const link = links.find((l) => l.destinations?.type === 'github_astro');
	if (!link) return null;

	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, encrypted_credentials, is_active')
		.eq('id', link.destination_id)
		.maybeSingle();

	return (data as DestinationForPublish | null) ?? null;
}

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
	const dest = await loadAstroDestination(supabase, siteId);
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
	}

	await saveSiteAstroLayout(supabase, siteId, layout);
	return { ok: true, layout };
}

export async function syncSiteAstroLayoutToGitHub(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
	const dest = await loadAstroDestination(supabase, siteId);
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

	return {
		ok: true,
		summary: `Zapisano ${navPath} i ${catPath} w ${cfg.owner}/${cfg.repo}`,
	};
}
