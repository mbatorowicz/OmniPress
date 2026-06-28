import type { LayoutComponentId } from '@/lib/astro-layout/components';

export const LAYOUT_EDITOR_TABS = ['header', 'home', 'sidebar', 'footer', 'site'] as const;

export type LayoutEditorTab = (typeof LAYOUT_EDITOR_TABS)[number];

export const DEFAULT_LAYOUT_TAB: LayoutEditorTab = 'header';

export const TOPBAR_COMPONENTS: LayoutComponentId[] = ['topbar.tagline'];
export const HEADER_TAB_COMPONENTS: LayoutComponentId[] = ['header.brand', 'header.navigation'];
export const HEADER_BRAND_COMPONENTS: LayoutComponentId[] = ['header.brand'];
export const HEADER_NAV_COMPONENTS: LayoutComponentId[] = ['header.navigation'];

export function isLayoutEditorTab(value: string): value is LayoutEditorTab {
	return (LAYOUT_EDITOR_TABS as readonly string[]).includes(value);
}

export function layoutTabHref(siteId: string, tab: LayoutEditorTab): string {
	return `/admin/units/${siteId}/layout/${tab}`;
}

export function sectionToDefaultTab(section: string): LayoutEditorTab {
	if (isLayoutEditorTab(section)) return section;
	switch (section) {
		case 'navigation':
		case 'topbar':
			return 'header';
		case 'categories':
			return DEFAULT_LAYOUT_TAB;
		case 'components':
			return 'home';
		case 'sidebar':
			return 'sidebar';
		case 'footer':
			return 'footer';
		case 'header':
			return 'header';
		case 'site':
			return 'site';
		default:
			return DEFAULT_LAYOUT_TAB;
	}
}

export function resolveLayoutReturnTab(
	section: string,
	returnTab?: string | null,
): LayoutEditorTab {
	if (returnTab && isLayoutEditorTab(returnTab)) return returnTab;
	return sectionToDefaultTab(section);
}

export function tabToLayoutZone(
	tab: LayoutEditorTab,
): import('@/lib/astro-layout/components').LayoutZone | null {
	switch (tab) {
		case 'header':
			return 'header';
		case 'home':
			return 'home';
		case 'sidebar':
			return 'sidebar';
		case 'footer':
			return 'footer';
		case 'site':
			return 'site';
		default:
			return null;
	}
}
