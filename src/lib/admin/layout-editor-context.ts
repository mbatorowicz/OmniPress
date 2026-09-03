import type { SupabaseClient } from '@supabase/supabase-js';
import {
	fetchLiveLayoutFingerprint,
	fetchLiveNavigationHrefCount,
} from '@/lib/astro-layout/store';
import { loadLayoutForEditor } from '@/lib/admin/layout-editor-load';
import type { DraftLiveScope, DraftLiveStatus } from '@/lib/astro-layout/layout-sync-meta';
import {
	computeCombinedDraftLiveStatus,
	hashLayoutFile,
	resolveDraftLiveStatus,
} from '@/lib/astro-layout/layout-sync-meta.server';
import type { LayoutContract, SiteAstroLayout } from '@/lib/astro-layout/types';
import {
	countNavigationHrefs,
	formatNavValidationIssues,
	hasMissingHrefIssues,
	validateNavigationLinks,
} from '@/lib/astro-layout/validate-nav';
import { buildKnownNavPaths } from '@/lib/astro-layout/nav-known-paths';
import { listSitePages } from '@/lib/site-pages/access';
import { buildSitePagePublicPath } from '@/lib/site-pages/url';
import { loadSiteAstroDestination } from './sites';
import type { PageOption } from './link-options';

export type LayoutEditorSection =
	| 'layout'
	| 'navigation'
	| 'categories'
	| 'components'
	| 'settings'
	| 'all'
	| import('@/lib/admin/layout-editor-tabs').LayoutEditorTab;

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
	combinedDraftStatus: DraftLiveStatus;
	navDraftStatus: DraftLiveStatus;
	categoriesDraftStatus: DraftLiveStatus;
	lastPublishedAt?: string;
	lastPublishedSha?: string;
	lastDraftSavedAt?: string;
	layoutFilePath?: string;
	layoutContract?: LayoutContract;
	autoImported?: boolean;
	autoImportHrefCount?: number;
	autoImportPath?: string;
	autoImportError?: string;
};

export async function loadLayoutEditorContext(
	supabase: SupabaseClient,
	siteId: string,
	options: {
		autoImport?: boolean;
		draftStatusScope?: DraftLiveScope;
		authorId?: string | null;
	} = {},
): Promise<LayoutEditorContext | null> {
	const { data: site } = await supabase
		.from('sites')
		.select('id, name, slug')
		.eq('id', siteId)
		.maybeSingle();

	if (!site) return null;

	const loaded = await loadLayoutForEditor(supabase, siteId, options);
	const { layout, autoImported, autoImportHrefCount, autoImportPath, autoImportError } = loaded;

	const hasAstroChannel = Boolean(await loadSiteAstroDestination(supabase, siteId));
	const draftStatusScope = options.draftStatusScope ?? 'navigation';

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
	);
	const navIssues = validateNavigationLinks(layout.navigation, knownNavPaths);
	const navWarningLines = formatNavValidationIssues(navIssues);
	const navHasMissingHref = hasMissingHrefIssues(navIssues);
	const draftHrefCount = countNavigationHrefs(layout.navigation);
	const draftHash = hashLayoutFile(layout);
	const publishedHash = layout.sync?.publishedLayoutHash;

	let liveFingerprint = null;
	if (hasAstroChannel) {
		const localDraftAhead = Boolean(publishedHash && draftHash !== publishedHash);
		if (!localDraftAhead) {
			liveFingerprint = await fetchLiveLayoutFingerprint(supabase, siteId, layout);
		}
	}

	const combined = hasAstroChannel
		? liveFingerprint
			? computeCombinedDraftLiveStatus(layout, liveFingerprint)
			: {
					combined: resolveDraftLiveStatus(layout, null),
					nav: resolveDraftLiveStatus(layout, null),
					categories: resolveDraftLiveStatus(layout, null),
				}
		: { combined: 'unknown' as const, nav: 'unknown' as const, categories: 'unknown' as const };

	const draftStatus: DraftLiveStatus = hasAstroChannel
		? resolveDraftLiveStatus(layout, liveFingerprint)
		: 'unknown';

	const liveHrefCount = hasAstroChannel
		? await fetchLiveNavigationHrefCount(supabase, siteId, layout)
		: null;

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
		combinedDraftStatus: combined.combined,
		navDraftStatus: combined.nav,
		categoriesDraftStatus: combined.categories,
		lastPublishedAt: layout.sync?.lastPublishedAt,
		lastPublishedSha: layout.sync?.lastPublishedSha,
		lastDraftSavedAt: layout.sync?.lastDraftSavedAt,
		layoutFilePath: layout.layoutPath,
		layoutContract: liveFingerprint?.layoutContract ?? layout.sync?.layoutContract,
		autoImported,
		autoImportHrefCount,
		autoImportPath,
		autoImportError,
	};
}

import {
	layoutTabHref,
	resolveLayoutReturnTab,
} from '@/lib/admin/layout-editor-tabs';

export function buildLayoutEditorReturnUrl(
	siteId: string,
	section: string,
	returnTab?: string | null,
	returnContext?: string | null,
): string {
	if (section === 'settings') return `/admin/units/${siteId}`;
	if (section === 'categories') return `/admin/units/${siteId}/posts`;
	if (returnContext === 'unit-components' || section === 'components') {
		return `/admin/units/${siteId}/components`;
	}
	const tab = resolveLayoutReturnTab(section, returnTab);
	return layoutTabHref(siteId, tab);
}

export function layoutSectionReturnPath(
	section: string,
	returnTab?: string | null,
	returnContext?: string | null,
): string {
	if (section === 'settings') return 'settings';
	if (section === 'categories') return 'posts';
	if (returnContext === 'unit-components') return 'components';
	const tab = resolveLayoutReturnTab(section, returnTab);
	return `layout/${tab}`;
}
