import type { SupabaseClient } from '@supabase/supabase-js';
import { collectPostAssetWrites, type CollectedAssets } from '@/lib/publish/github-astro-assets';
import {
	isManagedAttachmentFilename,
} from '@/lib/publish/import-asset-model';
import {
	listGitHubDirectoryBlobs,
	type GitHubConfig,
} from '@/lib/publish/github-api';
import { joinContentPath } from '@/lib/publish/paths';
import type { PostAsset } from '@/lib/publish/asset-model';
import { pagesContentPathFromConfig, sitePageDirFromMarkdownPath } from './paths';

/** Strony zawsze w folderze obok index.md, z względnym `./plik`. */
export function pageAssetGitHubConfig(
	cfg: GitHubConfig,
	destConfig: Record<string, unknown>,
): GitHubConfig {
	return {
		...cfg,
		contentPath: pagesContentPathFromConfig(destConfig),
		contentLayout: 'folder',
		assetPublicBase: null,
	};
}

export async function collectPageAssetWrites(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	destConfig: Record<string, unknown>,
	token: string,
	markdownPath: string,
	assets: PostAsset[],
	pruneOrphans = true,
): Promise<CollectedAssets> {
	return collectPostAssetWrites(
		supabase,
		pageAssetGitHubConfig(cfg, destConfig),
		token,
		sitePageDirFromMarkdownPath(markdownPath),
		assets,
		{ deleteOrphan: pruneOrphans ? isManagedAttachmentFilename : () => false },
	);
}

export async function stalePageFolderDeletes(
	cfg: GitHubConfig,
	token: string,
	oldMarkdownPath: string,
): Promise<string[]> {
	const folder = sitePageDirFromMarkdownPath(oldMarkdownPath);
	try {
		const remote = await listGitHubDirectoryBlobs(cfg, token, folder);
		return remote
			.filter((blob) => !blob.name.toLowerCase().endsWith('.md'))
			.filter((blob) => isManagedAttachmentFilename(blob.name))
			.map((blob) => joinContentPath(folder, blob.name));
	} catch {
		return [];
	}
}
