import type { CategoryDefinition, NavItem, SiteAstroLayout } from '@/lib/astro-layout/types';
import { getNavigationFromLayout, syncNavigationInLayout } from '@/lib/astro-layout/migrate-layout';
import { collectInternalNavHrefs } from '@/lib/astro-layout/reshape-top-nav';
import { normalizeInternalHref } from '@/lib/astro-layout/validate-nav';
import { categoryArchiveHref } from './checklist-model';

function isGminaItem(item: NavItem): boolean {
	if (item.label === 'Gmina') return true;
	return item.href ? normalizeInternalHref(item.href) === '/gmina' : false;
}

export function unlistedCategories(
	navigation: NavItem[],
	categories: Pick<CategoryDefinition, 'slug' | 'name'>[],
): Pick<CategoryDefinition, 'slug' | 'name'>[] {
	const hrefs = new Set(collectInternalNavHrefs(navigation));
	return categories.filter((category) => {
		const slug = category.slug.trim().toLowerCase();
		if (!slug) return false;
		return !hrefs.has(categoryArchiveHref(slug));
	});
}

/** Kategorie spoza całego menu trafiają do zakładki Gmina; bez Gminy — na koniec poziomu 1. */
export function appendUnlistedCategoriesToGmina(
	navigation: NavItem[],
	categories: Pick<CategoryDefinition, 'slug' | 'name'>[],
): NavItem[] {
	const missing = unlistedCategories(navigation, categories);
	if (missing.length === 0) return navigation;

	const leaves: NavItem[] = missing.map((category) => ({
		label: category.name.trim() || category.slug,
		href: categoryArchiveHref(category.slug),
	}));

	const gminaIndex = navigation.findIndex(isGminaItem);
	if (gminaIndex < 0) return [...navigation, ...leaves];

	const gmina = navigation[gminaIndex]!;
	const next = [...navigation];
	next[gminaIndex] = { ...gmina, children: [...(gmina.children ?? []), ...leaves] };
	return next;
}

export function ensureUnlistedCategoriesInGmina(layout: SiteAstroLayout): SiteAstroLayout {
	const navigation = appendUnlistedCategoriesToGmina(
		getNavigationFromLayout(layout),
		layout.categories,
	);
	return syncNavigationInLayout(layout, navigation);
}
