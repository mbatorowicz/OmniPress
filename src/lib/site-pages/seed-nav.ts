import type { SupabaseClient } from '@supabase/supabase-js';
import type { NavItem } from '@/lib/astro-layout/types';
import { loadSiteAstroLayout } from '@/lib/astro-layout/store';
import {
	collectNavHrefs,
	isExternalHref,
	normalizeInternalHref,
} from '@/lib/astro-layout/validate-nav';
import { placeholderPageContent } from '@/lib/sync/policy';
import { createSitePage, getSitePageById, listSitePages } from './access';
import { buildSitePagePublicPath, parseSitePagePublicPath } from './url';

const SKIP_PATHS = new Set(['/', '/kontakt']);

export type NavPageSpec = {
	href: string;
	title: string;
	path_prefix: string;
	slug: string;
};

export function collectNavPageSpecs(navigation: NavItem[]): NavPageSpec[] {
	const refs = collectNavHrefs(navigation);
	const unique = new Map<string, NavPageSpec>();

	for (const ref of refs) {
		if (isExternalHref(ref.href)) continue;
		const href = normalizeInternalHref(ref.href);
		if (SKIP_PATHS.has(href)) continue;
		const parsed = parseSitePagePublicPath(href);
		if (!parsed) continue;
		const label = ref.labelPath.split(' → ').pop()?.trim() || parsed.slug;
		if (!unique.has(href)) {
			unique.set(href, {
				href,
				title: label,
				path_prefix: parsed.pathPrefix,
				slug: parsed.slug,
			});
		}
	}

	return [...unique.values()];
}

export type SeedNavPagesResult = {
	created: number;
	skipped: number;
	total: number;
};

/** Tworzy tylko brakujące szkice Omni — nic nie publikuje do GitHub. */
export async function seedNavSitePages(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string,
): Promise<SeedNavPagesResult> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	const specs = collectNavPageSpecs(layout.navigation);
	const existing = await listSitePages(supabase, siteId);
	const existingByPath = new Set(
		existing.map((page) => buildSitePagePublicPath(page.path_prefix, page.slug)),
	);

	let created = 0;
	let skipped = 0;

	for (const spec of specs) {
		if (existingByPath.has(spec.href)) {
			skipped += 1;
			continue;
		}
		const inserted = await createSitePage(supabase, siteId, authorId);
		if (!inserted.ok) continue;
		const { error } = await supabase
			.from('site_pages')
			.update({
				title: spec.title,
				slug: spec.slug,
				path_prefix: spec.path_prefix,
				content_md: placeholderPageContent(),
			})
			.eq('id', inserted.page.id);
		if (error) continue;
		const saved = await getSitePageById(supabase, inserted.page.id);
		if (saved) existingByPath.add(spec.href);
		created += 1;
	}

	return { created, skipped, total: specs.length };
}
