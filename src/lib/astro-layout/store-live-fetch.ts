import type { SupabaseClient } from '@supabase/supabase-js';
import { layoutConfigPath } from '@/lib/admin/config-paths';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import {
	getGitHubFileBlobSha,
	getGitHubFileText,
	parseGitHubRepoConfig,
} from '@/lib/publish/github-api';
import {
	hashLayoutFile,
	hashLayoutFileText,
	hashNavigationFileText,
	type LiveLayoutFingerprint,
} from './layout-sync-meta.server';
import { getNavigationFromLayout } from './migrate-layout';
import { parseLayoutFile, parseNavigationJson } from './parse';
import type { SiteAstroLayout } from './types';
import { collectNavHrefs } from './validate-nav';

export async function fetchLiveNavigationHrefCount(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<number | null> {
	const draftHash = hashLayoutFile(layout);
	if (
		layout.sync?.publishedLayoutHash &&
		draftHash === layout.sync.publishedLayoutHash
	) {
		return collectNavHrefs(getNavigationFromLayout(layout)).length;
	}

	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
		const layoutBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layoutPath);
		if (layoutBlobSha) {
			const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
			if (layoutText) {
				const parsed = parseLayoutFile(layoutText);
				const navSlot = parsed.slots.find((s) => s.component === 'header.navigation');
				const navigation = navSlot?.widget?.navigation ?? [];
				return collectNavHrefs(navigation).length;
			}
		}

		const navText = await getGitHubFileText(cfg, creds.token, layout.navigationPath);
		if (!navText) return null;
		return collectNavHrefs(parseNavigationJson(navText)).length;
	} catch {
		return null;
	}
}

export async function fetchLiveLayoutFingerprint(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<LiveLayoutFingerprint | null> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return null;

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return null;

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return null;

	try {
		const layoutPath = layout.layoutPath || layoutConfigPath(dest.config);
		const layoutBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layoutPath);

		if (layoutBlobSha) {
			const draftHash = hashLayoutFile(layout);
			const publishedHash = layout.sync?.publishedLayoutHash;
			const storedBlob = layout.sync?.publishedLiveBlobSha;
			const needsContent =
				!publishedHash ||
				draftHash !== publishedHash ||
				!storedBlob ||
				layoutBlobSha !== storedBlob;

			let layoutHash: string | undefined;
			if (needsContent) {
				const layoutText = await getGitHubFileText(cfg, creds.token, layoutPath);
				layoutHash = layoutText ? (hashLayoutFileText(layoutText) ?? undefined) : undefined;
			} else {
				layoutHash = publishedHash;
			}

			return {
				layoutHash,
				blobSha: layoutBlobSha,
				layoutContract: 'unified',
			};
		}

		const catBlobSha = await getGitHubFileBlobSha(cfg, creds.token, layout.categoriesPath);
		if (!catBlobSha) return null;

		const [navText, catText] = await Promise.all([
			getGitHubFileText(cfg, creds.token, layout.navigationPath),
			getGitHubFileText(cfg, creds.token, layout.categoriesPath),
		]);

		const navHash = navText ? (hashNavigationFileText(navText) ?? undefined) : undefined;
		const catHash = catText ? (hashLayoutFileText(catText) ?? undefined) : undefined;
		return {
			layoutHash: catHash ?? navHash,
			blobSha: catBlobSha,
			layoutContract: 'legacy',
		};
	} catch {
		return null;
	}
}

/** @deprecated użyj fetchLiveLayoutFingerprint */
export async function fetchLiveLayoutHashes(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
): Promise<{ layoutHash?: string; navHash?: string; categoriesHash?: string } | null> {
	const fp = await fetchLiveLayoutFingerprint(supabase, siteId, layout);
	if (!fp?.layoutHash) return fp ? { layoutHash: fp.layoutHash, navHash: fp.layoutHash, categoriesHash: fp.layoutHash } : null;
	const hash = fp.layoutHash;
	return { layoutHash: hash, navHash: hash, categoriesHash: hash };
}
