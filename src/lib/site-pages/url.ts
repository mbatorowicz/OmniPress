import { isValidSlug } from '@/lib/admin/slug';

/** Publiczny URL strony: /prefix/slug lub /slug gdy brak prefixu. */
export function buildSitePagePublicPath(pathPrefix: string, slug: string): string {
	const prefix = pathPrefix.trim();
	const s = slug.trim();
	if (prefix) return `/${prefix}/${s}`;
	return `/${s}`;
}

export function normalizePathPrefix(raw: string): string {
	return raw.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
}

export function isValidPathPrefix(prefix: string): boolean {
	if (!prefix) return true;
	return isValidSlug(prefix);
}

export function parseSitePagePublicPath(href: string): { pathPrefix: string; slug: string } | null {
	const path = href.trim().replace(/\/+$/, '');
	if (!path.startsWith('/') || path.startsWith('//')) return null;
	const segments = path.slice(1).split('/').filter(Boolean);
	if (segments.length === 1) return { pathPrefix: '', slug: segments[0] };
	if (segments.length === 2) return { pathPrefix: segments[0], slug: segments[1] };
	return null;
}
