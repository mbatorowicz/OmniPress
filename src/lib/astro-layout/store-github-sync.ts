import type { SupabaseClient } from '@supabase/supabase-js';
import { layoutConfigPath } from '@/lib/admin/config-paths';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
	getGitHubFileBlobSha,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	type GitHubTextFileWrite,
} from '@/lib/publish/github-api';
import { buildLayoutRecentChangeEntry } from '@/lib/recent-changes/layout-entry';
import { upsertRecentChange } from '@/lib/recent-changes/upsert';
import { type LayoutSyncScope } from './layout-sync-meta';
import { hashLayoutFile, withPublishedMeta } from './layout-sync-meta.server';
import { syncNavigationInLayout } from './migrate-layout';
import { buildLayoutFilePayload } from './parse';
import { saveSiteAstroLayout } from './store-persist';
import type { SiteAstroLayout } from './types';

export type LayoutGitHubSyncOptions = {
	scope?: LayoutSyncScope;
	includeRecentChanges?: boolean;
};

export type LayoutGitHubSyncResult =
	| { ok: true; summary: string; commitSha: string; skipped?: false }
	| { ok: true; summary: string; skipped: true }
	| { ok: false; error: string; detail?: string };

const LAYOUT_SYNC_COMMIT_MESSAGES: Record<LayoutSyncScope, string> = {
	layout: 'OmniPress: publikacja layoutu',
	all: 'OmniPress: publikacja layoutu',
	navigation: 'OmniPress: publikacja layoutu',
	categories: 'OmniPress: publikacja layoutu',
};

export async function syncSiteAstroLayoutToGitHub(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
	options: LayoutGitHubSyncOptions = {},
): Promise<LayoutGitHubSyncResult> {
	const scope = options.scope ?? 'all';
	const includeRecentChanges =
		options.includeRecentChanges ?? (scope === 'all' || scope === 'layout');

	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
	let publishLayout = syncNavigationInLayout(layout, layout.navigation);

	if (includeRecentChanges) {
		try {
			const entry = buildLayoutRecentChangeEntry();
			const rcSlot = publishLayout.slots.find((s) => s.component === 'sidebar.recent_changes');
			const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);
			publishLayout = {
				...publishLayout,
				slots: publishLayout.slots.map((slot) =>
					slot.component === 'sidebar.recent_changes' ? { ...slot, entries } : slot,
				),
			};
		} catch {
			// Rejestr zmian nie blokuje sync layoutu
		}
	}

	try {
		const content = buildLayoutFilePayload(publishLayout);
		const publishHash = hashLayoutFile(publishLayout);

		const storedHash = layout.sync?.publishedLayoutHash;
		if (storedHash && publishHash === storedHash) {
			const liveBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layoutPath);
			if (
				liveBlobSha &&
				layout.sync?.publishedLiveBlobSha &&
				liveBlobSha === layout.sync.publishedLiveBlobSha
			) {
				return {
					ok: true,
					skipped: true,
					summary: 'Layout bez zmian względem strony — pominięto commit na GitHub.',
				};
			}
		}

		const files: GitHubTextFileWrite[] = [{ path: layoutPath, content }];

		const { commitSha, written, blobShas } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			files,
			LAYOUT_SYNC_COMMIT_MESSAGES[scope],
		);

		const writtenPaths = files.map((f) => f.path).join(', ');
		const githubSummary = `1 commit (${written} plików): ${writtenPaths} w ${cfg.owner}/${cfg.repo} | Vercel zbuduje stronę automatycznie (webhook).`;

		const publishedLayout = withPublishedMeta(publishLayout, {
			commitSha,
			scope: 'layout',
			liveBlobSha: blobShas[layoutPath],
			layoutContract: 'unified',
		});
		await saveSiteAstroLayout(supabase, siteId, publishedLayout, { updateDraftMeta: false });

		return { ok: true, summary: githubSummary, commitSha, skipped: false };
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'sync_failed';
		return { ok: false, error: 'sync_failed', detail: detail.slice(0, 300) };
	}
}
