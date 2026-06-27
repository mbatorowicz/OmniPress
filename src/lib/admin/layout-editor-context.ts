import type { SupabaseClient } from '@supabase/supabase-js';
import {
	importSiteAstroLayoutFromGitHub,
	loadSiteAstroLayout,
} from '@/lib/astro-layout/store';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import {
	buildKnownNavPaths,
	formatNavValidationIssues,
	validateNavigationLinks,
} from '@/lib/astro-layout/validate-nav';
import { listSitePages } from '@/lib/site-pages/access';
import { buildSitePagePublicPath } from '@/lib/site-pages/url';
import { loadSiteAstroDestination } from './sites';
import type { PageOption } from './link-options';

export const DEFAULT_STATIC_ROUTES = ['/', '/kontakt'] as const;

export type LayoutEditorContext = {
	site: { id: string; name: string; slug: string };
	layout: SiteAstroLayout;
	hasAstroChannel: boolean;
	publishedPages: PageOption[];
	navWarningLines: string[];
};

export async function loadLayoutEditorContext(
	supabase: SupabaseClient,
	siteId: string,
	options: { autoImport?: boolean } = {},
): Promise<LayoutEditorContext | null> {
	const { data: site } = await supabase
		.from('sites')
		.select('id, name, slug')
		.eq('id', siteId)
		.maybeSingle();

	if (!site) return null;

	let layout = await loadSiteAstroLayout(supabase, siteId);
	const hasAstroChannel = Boolean(await loadSiteAstroDestination(supabase, siteId));

	if (options.autoImport !== false) {
		const emptyLayout =
			layout.navigation.length === 0 &&
			layout.categories.length === 0 &&
			layout.slots.length === 0;
		if (emptyLayout && hasAstroChannel) {
			const imported = await importSiteAstroLayoutFromGitHub(supabase, siteId);
			if (imported.ok) layout = imported.layout;
		}
	}

	const publishedPages = (await listSitePages(supabase, siteId))
		.filter((p) => p.status === 'published')
		.map((p) => ({
			path: buildSitePagePublicPath(p.path_prefix, p.slug),
			title: p.title,
		}));

	const knownNavPaths = await buildKnownNavPaths(
		supabase,
		siteId,
		layout.categories.map((c) => c.slug),
		[...DEFAULT_STATIC_ROUTES],
	);
	const navWarningLines = formatNavValidationIssues(
		validateNavigationLinks(layout.navigation, knownNavPaths),
	);

	return {
		site: { id: site.id, name: site.name, slug: site.slug },
		layout,
		hasAstroChannel,
		publishedPages,
		navWarningLines,
	};
}

export function layoutSectionReturnPath(section: string): string {
	switch (section) {
		case 'categories':
			return 'categories';
		case 'components':
			return 'components';
		case 'navigation':
		case 'all':
		default:
			return 'navigation';
	}
}
