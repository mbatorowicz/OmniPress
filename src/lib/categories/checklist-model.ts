import { collectNavHrefs, normalizeInternalHref } from '@/lib/astro-layout/validate-nav';
import { getNavigationFromLayout } from '@/lib/astro-layout/migrate-layout';
import { isCategoryFeedComponent } from '@/lib/astro-layout/components';
import type { DraftLiveStatus } from '@/lib/astro-layout/layout-sync-meta';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';

export type CategoryChecklistStepId = 'draft' | 'published' | 'homeFeed' | 'menu';

export type CategoryChecklistStep = {
	id: CategoryChecklistStepId;
	done: boolean;
};

export type CategoryChecklistRow = {
	slug: string;
	name: string;
	inHomeFeed: boolean;
	inMenu: boolean;
};

export function categoryArchiveHref(slug: string): string {
	return `/${slug.trim().toLowerCase()}`;
}

export function categoryInHomeFeed(
	layout: Pick<SiteAstroLayout, 'slots' | 'categoryDisplays'>,
	slug: string,
): boolean {
	const key = slug.trim().toLowerCase();
	if (!key) return false;
	return layout.slots.some((slot) => {
		if (!isCategoryFeedComponent(slot.component)) return false;
		if (!slot.component.startsWith('home.')) return false;
		return (layout.categoryDisplays[slot.id] ?? []).some((item) => item.toLowerCase() === key);
	});
}

export function categoryInMenu(layout: SiteAstroLayout, slug: string): boolean {
	const target = categoryArchiveHref(slug);
	if (target === '/') return false;
	return collectNavHrefs(getNavigationFromLayout(layout)).some(
		(ref) => normalizeInternalHref(ref.href) === target,
	);
}

export function buildCategoryChecklistRows(layout: SiteAstroLayout): CategoryChecklistRow[] {
	return layout.categories
		.filter((item) => item.slug && item.name)
		.map((item) => ({
			slug: item.slug,
			name: item.name,
			inHomeFeed: categoryInHomeFeed(layout, item.slug),
			inMenu: categoryInMenu(layout, item.slug),
		}));
}

export function buildCategoryChecklistSteps(
	layout: SiteAstroLayout,
	draftStatus: DraftLiveStatus,
): CategoryChecklistStep[] {
	const rows = buildCategoryChecklistRows(layout);
	return [
		{ id: 'draft', done: Boolean(layout.sync?.lastDraftSavedAt) || layout.categories.length > 0 },
		{ id: 'published', done: draftStatus === 'in_sync' },
		{ id: 'homeFeed', done: rows.length > 0 && rows.every((row) => row.inHomeFeed) },
		{ id: 'menu', done: rows.length > 0 && rows.every((row) => row.inMenu) },
	];
}
