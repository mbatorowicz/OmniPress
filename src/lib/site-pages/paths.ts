import { joinContentPath } from '@/lib/publish/paths';

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
