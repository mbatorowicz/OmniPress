import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
	getGitHubFileText,
	parseGitHubRepoConfig,
} from '@/lib/publish/github-api';
import { appendRecentChangeOnGitHub } from './github';
import { parseRecentChangesFile } from './parse';
import type { RecentChangeEntry, RecentChangesFile } from './types';
import { emptyRecentChangesFile, recentChangesPath } from './types';

export async function loadRecentChangesFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ ok: true; file: RecentChangesFile } | { ok: false; error: string }> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const path = recentChangesPath(dest.config);
	const text = await getGitHubFileText(cfg, creds.token, path);
	if (!text) return { ok: true, file: emptyRecentChangesFile() };

	try {
		return { ok: true, file: parseRecentChangesFile(text) };
	} catch {
		return { ok: false, error: 'invalid_file' };
	}
}

export async function announceRecentChangeOnGitHub(
	supabase: SupabaseClient,
	siteId: string,
	entry: RecentChangeEntry,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	try {
		await appendRecentChangeOnGitHub(cfg, creds.token, dest.config, entry);
		return { ok: true };
	} catch {
		return { ok: false, error: 'sync_failed' };
	}
}
