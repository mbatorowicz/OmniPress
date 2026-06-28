import { adminLayout } from '@/i18n';
import type { LayoutZone } from '@/lib/astro-layout/components';
import type { LayoutEditorTab } from '@/lib/admin/layout-editor-tabs';

export function layoutTabLabel(tab: LayoutEditorTab): string {
	const labels: Record<LayoutEditorTab, string> = {
		topbar: adminLayout.layoutTabTopbar,
		header: adminLayout.layoutTabHeader,
		menu: adminLayout.layoutTabMenu,
		home: adminLayout.layoutTabHome,
		sidebar: adminLayout.layoutTabSidebar,
		footer: adminLayout.layoutTabFooter,
		site: adminLayout.layoutTabSite,
		categories: adminLayout.layoutTabCategories,
	};
	return labels[tab];
}

export function layoutTabLead(tab: LayoutEditorTab): string {
	const leads: Partial<Record<LayoutEditorTab, string>> = {
		topbar: adminLayout.layoutTabTopbarLead,
		header: adminLayout.layoutTabHeaderLead,
		menu: adminLayout.layoutTabMenuLead,
		home: adminLayout.layoutTabHomeLead,
		sidebar: adminLayout.layoutTabSidebarLead,
		footer: adminLayout.layoutTabFooterLead,
		site: adminLayout.layoutTabSiteLead,
		categories: adminLayout.layoutTabCategoriesLead,
	};
	return leads[tab] ?? adminLayout.layoutLead;
}

export function layoutZoneTitles(): Record<LayoutZone, string> {
	return {
		topbar: adminLayout.slotsZoneTopbar ?? 'Pasek górny',
		header: adminLayout.slotsZoneHeader ?? 'Nagłówek',
		home: adminLayout.slotsPreviewHomeZone,
		sidebar: adminLayout.slotsPreviewSidebarZone,
		footer: adminLayout.slotsZoneFooter ?? 'Stopka',
		site: adminLayout.slotsZoneSite ?? 'Meta strony',
	};
}
