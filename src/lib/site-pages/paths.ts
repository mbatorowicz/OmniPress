import { joinContentPath, parseExternalGitHubPath } from '@/lib/publish/paths';

export const DEFAULT_PAGES_CONTENT_PATH = 'src/content/pages';

export function pagesContentPathFromConfig(config: Record<string, unknown>): string {
	const raw = config.pages_content_path;
	if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/^\/+|\/+$/g, '');
	return DEFAULT_PAGES_CONTENT_PATH;
}

export function sitePageMarkdownPath(
	pagesRoot: string,
	pathPrefix: string,
	slug: string,
): string {
	const prefix = pathPrefix.trim();
	if (prefix) return joinContentPath(pagesRoot, prefix, slug, 'index.md');
	return joinContentPath(pagesRoot, slug, 'index.md');
}

export function sitePageDirFromMarkdownPath(filePath: string): string {
	return filePath.replace(/\/index\.md$/i, '');
}

export function resolveSitePageFilePath(
	destConfig: Record<string, unknown>,
	page: { path_prefix: string; slug: string; external_id: string | null },
): string {
	return (
		parseExternalGitHubPath(page.external_id) ??
		sitePageMarkdownPath(pagesContentPathFromConfig(destConfig), page.path_prefix, page.slug)
	);
}
