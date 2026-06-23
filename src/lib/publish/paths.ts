import { normalizeSlug, isValidSlug } from '@/lib/admin/slug';
import type { PostForPublish } from './types';

import type { ContentLayout } from './content-layout';

export function resolvePostSlug(post: PostForPublish): string {
	if (post.slug && isValidSlug(post.slug)) return post.slug;
	const fromTitle = normalizeSlug(post.title);
	if (fromTitle.length >= 2) return fromTitle;
	return `post-${post.id.slice(0, 8)}`;
}

export function joinContentPath(base: string, ...parts: string[]): string {
	const root = base.replace(/^\/+|\/+$/g, '');
	const rest = parts.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean);
	return [root, ...rest].join('/');
}

export function encodeGitHubPath(path: string): string {
	return path.split('/').map(encodeURIComponent).join('/');
}

/** Próbuje slug.md lub slug/index.md (layout folder); przy kolizji slug-2… */
export function slugFileCandidates(slug: string, layout: ContentLayout = 'flat', max = 20): string[] {
	if (layout === 'folder') {
		const candidates = [`${slug}/index.md`];
		for (let i = 2; i <= max; i++) {
			candidates.push(`${slug}-${i}/index.md`);
		}
		return candidates;
	}
	const candidates = [`${slug}.md`];
	for (let i = 2; i <= max; i++) {
		candidates.push(`${slug}-${i}.md`);
	}
	return candidates;
}

export function parseExternalGitHubPath(externalId: string | null): string | null {
	if (!externalId?.startsWith('github:')) return null;
	const path = externalId.slice('github:'.length);
	return path || null;
}

export function formatExternalGitHubPath(filePath: string): string {
	return `github:${filePath}`;
}

/** Folder wpisu (bez pliku markdown), np. src/content/news/slug */
export function postDirFromMarkdownPath(markdownPath: string): string {
	return markdownPath.replace(/\/[^/]+$/, '');
}

/** Segment slug z pełnej ścieżki index.md (layout folder). */
export function postSlugFromMarkdownPath(markdownPath: string, contentPath: string): string {
	const postDir = postDirFromMarkdownPath(markdownPath);
	const root = contentPath.replace(/^\/+|\/+$/g, '');
	const prefix = `${root}/`;
	if (postDir.startsWith(prefix)) return postDir.slice(prefix.length);
	const parts = postDir.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? postDir;
}
