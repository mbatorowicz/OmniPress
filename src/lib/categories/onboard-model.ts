import { isCategoryFeedComponent } from '@/lib/astro-layout/components';
import { getNavigationFromLayout, syncNavigationInLayout } from '@/lib/astro-layout/migrate-layout';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import { categoryArchiveHref, categoryInMenu } from './checklist-model';

export const AKTUALNOSCI_SLUG = 'aktualnosci';

export function findAktualnosciFeedSlotId(
	layout: Pick<SiteAstroLayout, 'slots' | 'categoryDisplays'>,
): string | null {
	const latest = layout.slots.find((slot) => slot.component === 'home.latest');
	if (latest) return latest.id;

	const withNews = layout.slots.find((slot) => {
		if (!isCategoryFeedComponent(slot.component)) return false;
		return (layout.categoryDisplays[slot.id] ?? []).includes(AKTUALNOSCI_SLUG);
	});
	if (withNews) return withNews.id;

	return layout.slots.find((slot) => isCategoryFeedComponent(slot.component))?.id ?? null;
}

export function addSlugToHomeFeed(layout: SiteAstroLayout, slug: string): SiteAstroLayout {
	const slotId = findAktualnosciFeedSlotId(layout);
	if (!slotId) return layout;
	const current = layout.categoryDisplays[slotId] ?? [];
	if (current.includes(slug)) return layout;
	return {
		...layout,
		categoryDisplays: { ...layout.categoryDisplays, [slotId]: [...current, slug] },
	};
}

export function addCategoryToMenu(layout: SiteAstroLayout, slug: string, name: string): SiteAstroLayout {
	if (categoryInMenu(layout, slug)) return layout;
	const navigation = [
		...getNavigationFromLayout(layout),
		{ label: name.trim() || slug, href: categoryArchiveHref(slug) },
	];
	return syncNavigationInLayout(layout, navigation);
}
