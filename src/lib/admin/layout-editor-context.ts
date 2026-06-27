import type { SupabaseClient } from '@supabase/supabase-js';
import {
	fetchLiveLayoutHashes,
	fetchLiveNavigationHrefCount,
	importSiteAstroLayoutFromGitHub,
	loadSiteAstroLayout,
} from '@/lib/astro-layout/store';
import {
	computeDraftLiveStatus,
	type DraftLiveScope,
	type DraftLiveStatus,
} from '@/lib/astro-layout/layout-sync-meta';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import {
	buildKnownNavPaths,
	countNavigationHrefs,
	formatNavValidationIssues,
	hasMissingHrefIssues,
	validateNavigationLinks,
} from '@/lib/astro-layout/validate-nav';
import { listSitePages } from '@/lib/site-pages/access';
import { buildSitePagePublicPath } from '@/lib/site-pages/url';
import { loadSiteAstroDestination } from './sites';
import { collectNavInternalPageOptions } from '@/lib/admin/navigation-tree';
import type { PageOption } from './link-options';

export const DEFAULT_STATIC_ROUTES = ['/', '/kontakt'] as const;

export type LayoutEditorContext = {
	site: { id: string; name: string; slug: string };
	layout: SiteAstroLayout;
	hasAstroChannel: boolean;
	publishedPages: PageOption[];
	navWarningLines: string[];
	navHasMissingHref: boolean;
	draftHrefCount: number;
	liveHrefCount: number | null;
	draftStatus: DraftLiveStatus;
	draftStatusScope: DraftLiveScope;
	lastPublishedAt?: string;
	lastPublishedSha?: string;
	lastDraftSavedAt?: string;
};

export async function loadLayoutEditorContext(
	supabase: SupabaseClient,
	siteId: string,
	options: { autoImport?: boolean; draftStatusScope?: DraftLiveScope } = {},
): Promise<LayoutEditorContext | null> {
	const { data: site } = await supabase
		.from('sites')
		.select('id, name, slug')
		.eq('id', siteId)
		.maybeSingle();

	if (!site) return null;

	let layout = await loadSiteAstroLayout(supabase, siteId);
	const hasAstroChannel = Boolean(await loadSiteAstroDestination(supabase, siteId));
	const draftStatusScope = options.draftStatusScope ?? 'navigation';

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
		[...DEFAULT_STATIC_ROUTES, ...collectNavInternalPageOptions(layout.navigation).map((p) => p.path)],
	);
	const navIssues = validateNavigationLinks(layout.navigation, knownNavPaths);
	const navWarningLines = formatNavValidationIssues(navIssues);
	const navHasMissingHref = hasMissingHrefIssues(navIssues);
	const draftHrefCount = countNavigationHrefs(layout.navigation);

	const liveHashes = hasAstroChannel
		? await fetchLiveLayoutHashes(supabase, siteId, layout)
		: null;
	const liveHrefCount = hasAstroChannel
		? await fetchLiveNavigationHrefCount(supabase, siteId, layout)
		: null;
	const draftStatus = hasAstroChannel
		? computeDraftLiveStatus(layout, draftStatusScope, liveHashes ?? undefined)
		: 'unknown';

	return {
		site: { id: site.id, name: site.name, slug: site.slug },
		layout,
		hasAstroChannel,
		publishedPages,
		navWarningLines,
		navHasMissingHref,
		draftHrefCount,
		liveHrefCount,
		draftStatus,
		draftStatusScope,
		lastPublishedAt: layout.sync?.lastPublishedAt,
		lastPublishedSha: layout.sync?.lastPublishedSha,
		lastDraftSavedAt: layout.sync?.lastDraftSavedAt,
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
