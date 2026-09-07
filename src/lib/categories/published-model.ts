import { hashLayoutFile } from '@/lib/astro-layout/layout-sync-meta.server';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import type { CategoryOption } from './types';

/** Szkic w bazie jest identyczny z ostatnią publikacją — lista lokalna = strona. */
export function isLayoutInPublishedSync(layout: SiteAstroLayout): boolean {
	const publishedHash = layout.sync?.publishedLayoutHash;
	if (!publishedHash) return false;
	return hashLayoutFile(layout) === publishedHash;
}

export function categoriesFromLayout(
	layout: Pick<SiteAstroLayout, 'categories'>,
): CategoryOption[] {
	return layout.categories
		.filter((c) => c.slug && c.name)
		.map((c) => ({
			slug: c.slug,
			name: c.name,
			sources: ['github_astro' as const],
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export function publishedCategorySlugs(categories: readonly { slug: string }[]): Set<string> {
	return new Set(categories.map((c) => c.slug.toLowerCase()));
}
