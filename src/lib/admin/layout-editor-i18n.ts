import { adminLayout } from '@/i18n';
import type { LayoutZone } from '@/lib/astro-layout/components';
import type { LayoutEditorTab } from '@/lib/admin/layout-editor-tabs';

export function layoutTabLabel(tab: LayoutEditorTab): string {
	const labels: Record<LayoutEditorTab, string> = {
		header: adminLayout.layoutTabHeader,
		home: adminLayout.layoutTabHome,
		sidebar: adminLayout.layoutTabSidebar,
		footer: adminLayout.layoutTabFooter,
		site: adminLayout.layoutTabSite,
	};
	return labels[tab];
}

export function layoutTabLead(tab: LayoutEditorTab): string {
	const leads: Partial<Record<LayoutEditorTab, string>> = {
		header: adminLayout.layoutTabHeaderLead,
		home: adminLayout.layoutTabHomeLead,
		sidebar: adminLayout.layoutTabSidebarLead,
		footer: adminLayout.layoutTabFooterLead,
		site: adminLayout.layoutTabSiteLead,
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
