import type { SupabaseClient } from '@supabase/supabase-js';
import {
	fetchLiveLayoutFingerprint,
	fetchLiveNavigationHrefCount,
	importSiteAstroLayoutFromGitHub,
	loadSiteAstroLayout,
	type LayoutImportReport,
} from '@/lib/astro-layout/store';
import { ensureLayoutFromGitHub } from '@/lib/admin/layout-auto-import';
import type { DraftLiveScope, DraftLiveStatus } from '@/lib/astro-layout/layout-sync-meta';
import {
	computeCombinedDraftLiveStatus,
	hashLayoutFile,
	resolveDraftLiveStatus,
} from '@/lib/astro-layout/layout-sync-meta.server';
import type { LayoutContract, SiteAstroLayout } from '@/lib/astro-layout/types';
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

export type LayoutEditorSection =
	| 'layout'
	| 'navigation'
	| 'categories'
	| 'components'
	| 'settings'
	| 'all';

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
	options: { autoImport?: boolean; draftStatusScope?: DraftLiveScope } = {},
): Promise<LayoutEditorContext | null> {
	const { data: site } = await supabase
		.from('sites')
		.select('id, name, slug')
		.eq('id', siteId)
		.maybeSingle();

	if (!site) return null;

	let autoImported = false;
	let autoImportHrefCount: number | undefined;
	let autoImportPath: string | undefined;
	let autoImportError: string | undefined;

	let layout: SiteAstroLayout;
	if (options.autoImport !== false) {
		const ensured = await ensureLayoutFromGitHub(supabase, siteId);
		layout = ensured.layout;
		autoImported = ensured.imported;
		autoImportHrefCount = ensured.importReport?.hrefCount;
		autoImportPath = ensured.importReport?.navigationPath;
		autoImportError = ensured.importError;
	} else {
		layout = await loadSiteAstroLayout(supabase, siteId);
	}

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
		[...DEFAULT_STATIC_ROUTES, ...collectNavInternalPageOptions(layout.navigation).map((p) => p.path)],
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

export function buildLayoutEditorReturnUrl(siteId: string, section: string): string {
	const base = `/admin/units/${siteId}/layout`;
	switch (section) {
		case 'categories':
			return `${base}#zone-categories`;
		case 'components':
			return `${base}#zone-home`;
		case 'navigation':
			return `${base}#zone-header`;
		case 'settings':
			return `/admin/units/${siteId}`;
		case 'layout':
		case 'all':
		default:
			return base;
	}
}

export function layoutSectionReturnPath(section: string): string {
	switch (section) {
		case 'categories':
			return 'layout#zone-categories';
		case 'components':
			return 'layout#zone-home';
		case 'navigation':
			return 'layout#zone-header';
		case 'settings':
			return 'settings';
		case 'layout':
		case 'all':
		default:
			return 'layout';
	}
}
