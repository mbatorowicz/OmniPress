import type { SupabaseClient } from '@supabase/supabase-js';
import { layoutConfigPath } from '@/lib/admin/config-paths';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
	getGitHubFileText,
	parseGitHubRepoConfig,
} from '@/lib/publish/github-api';
import { parseLayoutFile } from '@/lib/astro-layout/parse';
import { getRecentChangeEntriesFromLayout } from '@/lib/astro-layout/migrate-layout';
import { loadSiteAstroLayout } from '@/lib/astro-layout/store';
import { appendRecentChangeOnGitHub } from './github';
import { parseRecentChangesFile } from './parse';
import { recentChangesPath } from './types';
import type { RecentChangeEntry, RecentChangesFile } from './types';
import { emptyRecentChangesFile } from './types';

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

	const layoutPath = layoutConfigPath(dest.config);
	const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
	if (layoutText) {
		try {
			const parsed = parseLayoutFile(layoutText);
			const entries = getRecentChangeEntriesFromLayout({
				categories: parsed.categories,
				categoryDisplays: parsed.displays,
				zones: parsed.zones,
				slots: parsed.slots,
				navigation: [],
				layoutPath,
				navigationPath: '',
				categoriesPath: '',
			});
			return { ok: true, file: { entries } };
		} catch {
			return { ok: false, error: 'invalid_file' };
		}
	}

	const legacyPath = recentChangesPath(dest.config);
	const text = await getGitHubFileText(cfg, creds.token, legacyPath);
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
		const draftLayout = await loadSiteAstroLayout(supabase, siteId);
		await appendRecentChangeOnGitHub(cfg, creds.token, dest.config, entry, { draftLayout });
		return { ok: true };
	} catch {
		return { ok: false, error: 'sync_failed' };
	}
}
