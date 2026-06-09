import type { SupabaseClient } from '@supabase/supabase-js';
import type { NavItem } from '@/lib/astro-layout/types';
import { loadSiteAstroLayout, syncSiteAstroLayoutToGitHub } from '@/lib/astro-layout/store';
import { collectNavHrefs } from '@/lib/astro-layout/validate-nav';
import {
	createSitePage,
	getSitePageById,
	listSitePages,
	markSitePagePublished,
	publishSitePageToGitHub,
	buildSitePagePublicPath,
	parseSitePagePublicPath,
} from '@/lib/site-pages';

const SKIP_PATHS = new Set(['/', '/kontakt']);
const PLACEHOLDER_MD = 'Treść strony w przygotowaniu.';

export type NavPageSpec = {
	href: string;
	title: string;
	path_prefix: string;
	slug: string;
};

function isExternalHref(href: string): boolean {
	return /^https?:\/\//i.test(href.trim());
}

function normalizeInternalHref(href: string): string {
	const trimmed = href.trim().replace(/\/+$/, '');
	if (!trimmed.startsWith('/')) return `/${trimmed}`;
	return trimmed || '/';
}

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
	published: number;
	skipped: number;
	githubFailed: string[];
	total: number;
	layoutSynced: boolean;
};

export async function seedNavSitePages(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string,
	options: { publishToGitHub?: boolean; syncLayout?: boolean } = {},
): Promise<SeedNavPagesResult> {
	const publishToGitHub = options.publishToGitHub ?? true;
	const syncLayout = options.syncLayout ?? publishToGitHub;

	const layout = await loadSiteAstroLayout(supabase, siteId);
	const specs = collectNavPageSpecs(layout.navigation);
	const existing = await listSitePages(supabase, siteId);
	const existingByPath = new Map(
		existing.map((page) => [
			buildSitePagePublicPath(page.path_prefix, page.slug),
			page,
		]),
	);

	let created = 0;
	let published = 0;
	let skipped = 0;
	const githubFailed: string[] = [];

	for (const spec of specs) {
		let page = existingByPath.get(spec.href);

		if (!page) {
			const inserted = await createSitePage(supabase, siteId, authorId);
			if (!inserted.ok) {
				githubFailed.push(`${spec.href}: ${inserted.error}`);
				continue;
			}
			const { error } = await supabase
				.from('site_pages')
				.update({
					title: spec.title,
					slug: spec.slug,
					path_prefix: spec.path_prefix,
					content_md: PLACEHOLDER_MD,
				})
				.eq('id', inserted.page.id);
			if (error) {
				githubFailed.push(`${spec.href}: save_failed`);
				continue;
			}
			page = (await getSitePageById(supabase, inserted.page.id))!;
			created++;
		} else {
			skipped++;
		}

		if (page.status === 'published' && page.external_id && publishToGitHub) {
			continue;
		}

		if (publishToGitHub) {
			const result = await publishSitePageToGitHub(supabase, page);
			if (!result.ok) {
				githubFailed.push(`${spec.href}: ${result.error}`);
				continue;
			}
			await markSitePagePublished(supabase, page.id, result.externalId);
			published++;
			continue;
		}

		if (page.status !== 'published') {
			await supabase.from('site_pages').update({ status: 'published' }).eq('id', page.id);
			published++;
		}
	}

	let layoutSynced = false;
	if (syncLayout && publishToGitHub && githubFailed.length === 0) {
		const synced = await syncSiteAstroLayoutToGitHub(supabase, siteId, layout);
		layoutSynced = synced.ok;
		if (!synced.ok) githubFailed.push(`layout: ${synced.error}`);
	}

	return {
		created,
		published,
		skipped,
		githubFailed,
		total: specs.length,
		layoutSynced,
	};
}
