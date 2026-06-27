import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from './sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	type GitHubCredentials,
} from '@/lib/publish/credentials';
import { parseGitHubRepoConfig, type GitHubConfig } from '@/lib/publish/github-api';
import type { DestinationForPublish } from '@/lib/publish/types';

export type ResolvedSiteGitHubChannel = {
	dest: DestinationForPublish;
	cfg: GitHubConfig;
	creds: GitHubCredentials;
};

export async function resolveSiteGitHubChannel(
	supabase: SupabaseClient,
	siteId: string,
): Promise<ResolvedSiteGitHubChannel | null> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	return { dest, cfg, creds };
}
