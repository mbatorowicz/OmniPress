import {
	getGitHubFile,
	parseGitHubRepoConfig,
	resolveGitHubWithdrawPaths,
	type GitHubConfig,
} from './github-api';
import {
	formatExternalGitHubPath,
	joinContentPath,
	postDirFromMarkdownPath,
	postSlugFromMarkdownPath,
	slugFileCandidates,
} from './paths';

export function publishedAssetUrl(
	cfg: GitHubConfig,
	postDir: string,
	assetName: string,
): string {
	const folderSlug = postSlugFromMarkdownPath(`${postDir}/index.md`, cfg.contentPath);
	if (cfg.assetPublicBase && cfg.contentLayout === 'folder') {
		return `/${cfg.assetPublicBase}/${folderSlug}/${assetName}`;
	}
	if (cfg.contentLayout === 'folder') return `./${assetName}`;
	return `./assets/${folderSlug}/${assetName}`;
}

export async function pickMarkdownPath(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	slug: string,
	preferredPath: string | null,
): Promise<{ filePath: string; existingSha?: string }> {
	if (preferredPath) {
		const existing = await getGitHubFile(cfg, token, preferredPath);
		return { filePath: preferredPath, existingSha: existing?.sha };
	}

	for (const fileName of slugFileCandidates(slug, cfg.contentLayout)) {
		const filePath = joinContentPath(cfg.contentPath, fileName);
		const existing = await getGitHubFile(cfg, token, filePath);
		if (!existing) return { filePath };
	}
	const fallback =
		cfg.contentLayout === 'folder'
			? joinContentPath(cfg.contentPath, `${slug}-${Date.now()}`, 'index.md')
			: joinContentPath(cfg.contentPath, `${slug}-${Date.now()}.md`);
	return { filePath: fallback };
}

type MarkdownPathPick = { filePath: string; existingSha?: string; cleanupExternalId?: string };

/** Wybiera ścieżkę index.md; przy zmianie slug (folder) przenosi publikację do nowego folderu. */
export async function resolvePublishMarkdownPath(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	slug: string,
	preferredPath: string | null,
): Promise<MarkdownPathPick> {
	if (cfg.contentLayout === 'folder') {
		const slugPath = joinContentPath(cfg.contentPath, slug, 'index.md');
		if (preferredPath) {
			const preferredDir = postDirFromMarkdownPath(preferredPath);
			const slugDir = postDirFromMarkdownPath(slugPath);
			if (preferredDir !== slugDir) {
				const existing = await getGitHubFile(cfg, token, slugPath);
				return {
					filePath: slugPath,
					existingSha: existing?.sha,
					cleanupExternalId: formatExternalGitHubPath(preferredPath),
				};
			}
		}
	}

	const picked = await pickMarkdownPath(cfg, token, slug, preferredPath);
	return picked;
}

export async function resolveStaleFolderDeletes(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	cleanupExternalId: string,
): Promise<string[]> {
	return resolveGitHubWithdrawPaths(cfg, token, [cleanupExternalId]);
}
