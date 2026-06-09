import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { sanitizePublishMarkdown } from '@/lib/content/sanitize';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import { buildSitePageMarkdown } from './frontmatter';
import { pagesContentPathFromConfig, sitePageMarkdownPath } from './paths';
import type { SitePageForPublish } from './types';
import {
	formatExternalGitHubPath,
	parseExternalGitHubPath,
} from '@/lib/publish/paths';
import {
	getGitHubFile,
	parseGitHubRepoConfig,
	putGitHubFile,
	deleteGitHubFile,
} from '@/lib/publish/github-api';
import { appendRecentChangeOnGitHub } from '@/lib/recent-changes/github';
import type { RecentChangeEntry } from '@/lib/recent-changes/types';
import { buildSitePagePublicPath } from './url';

export type SitePagePublishResult =
	| { ok: true; summary: string; externalId: string }
	| { ok: false; error: string; summary?: string };

function buildPageRecentChangeEntry(page: SitePageForPublish): RecentChangeEntry {
	return {
		title: page.title,
		href: buildSitePagePublicPath(page.path_prefix, page.slug),
		kind: 'page',
		changedAt: new Date().toISOString(),
		sourceId: page.id,
	};
}

export async function publishSitePageToGitHub(
	supabase: SupabaseClient,
	page: SitePageForPublish,
): Promise<SitePagePublishResult> {
	const dest = await loadSiteAstroDestination(supabase, page.site_id);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const pagesRoot = pagesContentPathFromConfig(dest.config);
	const preferredPath = parseExternalGitHubPath(page.external_id);
	const filePath =
		preferredPath ?? sitePageMarkdownPath(pagesRoot, page.path_prefix, page.slug);
	const existing = await getGitHubFile(cfg, creds.token, filePath);
	const body = buildSitePageMarkdown(
		page.title,
		page.path_prefix,
		page.slug,
		sanitizePublishMarkdown(page.content_md),
	);

	try {
		await putGitHubFile(
			cfg,
			creds.token,
			filePath,
			body,
			`OmniPress: strona ${page.title}`,
			existing?.sha,
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub upload failed';
		return { ok: false, error: 'publish_failed', summary: msg.slice(0, 200) };
	}

	try {
		await appendRecentChangeOnGitHub(
			cfg,
			creds.token,
			dest.config,
			buildPageRecentChangeEntry(page),
		);
	} catch {
		// Rejestr zmian nie blokuje publikacji strony
	}

	return {
		ok: true,
		summary: `Opublikowano ${filePath}`,
		externalId: formatExternalGitHubPath(filePath),
	};
}

export async function withdrawSitePageFromGitHub(
	supabase: SupabaseClient,
	page: SitePageForPublish,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const filePath = parseExternalGitHubPath(page.external_id);
	if (!filePath) return { ok: true };

	const dest = await loadSiteAstroDestination(supabase, page.site_id);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const existing = await getGitHubFile(cfg, creds.token, filePath);
	if (!existing) return { ok: true };

	try {
		await deleteGitHubFile(cfg, creds.token, filePath, existing.sha, `OmniPress: zdejmij stronę ${page.title}`);
	} catch {
		return { ok: false, error: 'withdraw_failed' };
	}
	return { ok: true };
}
