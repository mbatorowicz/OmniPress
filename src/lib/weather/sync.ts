import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroLayout } from '@/lib/astro-layout/store';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import { parseGitHubRepoConfig } from '@/lib/publish/github-api';
import { findWeatherSlot } from './filter';
import { syncWeatherWarningsOnGitHub } from './github';

export type WeatherSyncSiteResult = {
	siteId: string;
	ok: boolean;
	count?: number;
	error?: string;
	skipped?: boolean;
};

export async function syncWeatherWarningsForSite(
	supabase: SupabaseClient,
	siteId: string,
): Promise<WeatherSyncSiteResult> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	const widget = findWeatherSlot(layout);
	if (!widget) {
		return { siteId, ok: true, skipped: true, count: 0 };
	}

	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) {
		return { siteId, ok: true, skipped: true, count: 0 };
	}

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { siteId, ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { siteId, ok: false, error: 'no_github_token' };
	}

	const result = await syncWeatherWarningsOnGitHub(cfg, creds.token, dest.config, widget);
	if (!result.ok) return { siteId, ok: false, error: result.error };
	return { siteId, ok: true, count: result.count };
}

export async function syncWeatherWarningsForAllSites(
	supabase: SupabaseClient,
): Promise<{ processed: number; succeeded: number; failed: number; skipped: number; results: WeatherSyncSiteResult[] }> {
	const { data } = await supabase.from('sites').select('id').eq('is_active', true);
	const siteIds = (data ?? []).map((row) => row.id as string);

	const results: WeatherSyncSiteResult[] = [];
	let succeeded = 0;
	let failed = 0;
	let skipped = 0;

	for (const siteId of siteIds) {
		const result = await syncWeatherWarningsForSite(supabase, siteId);
		results.push(result);
		if (result.skipped) skipped++;
		else if (result.ok) succeeded++;
		else failed++;
	}

	return { processed: siteIds.length, succeeded, failed, skipped, results };
}
