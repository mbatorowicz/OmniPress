import { adminLayout, ui } from '@/i18n';
import { flattenNavigation, collectNavInternalPageOptions, type FlatNavRow } from '@/lib/admin/navigation-tree';
import { buildCategoryLinkOptions, mergePageOptionsForNavEditor, type PageOption } from '@/lib/admin/link-options';
import { buildNavTargetOptions, type NavTargetOptions } from '@/lib/admin/nav-target-options';
import {
	navEditorDepthColorsToStyle,
	resolveNavEditorDepthColors,
	type NavEditorDepthColors,
} from '@/lib/admin/nav-editor-colors';
import type { NavigationTableLabels } from '@/lib/admin/nav-form-labels';
import type { CategoryDefinition, NavItem } from '@/lib/astro-layout/types';

export type NavTreeSectionProps = {
	navigation: NavItem[];
	categories: CategoryDefinition[];
	publishedPages: PageOption[];
	navEditorDepthColors?: NavEditorDepthColors;
};

export function navHrefSubmitValue(row: FlatNavRow): string {
	if (row.hrefKind === 'none') return '';
	return row.hrefValue;
}

export type NavTreeSectionData = {
	rows: FlatNavRow[];
	parentRowMeta: { label: string; depth: number }[];
	navigationJsonPreview: string;
	depthLabels: readonly string[];
	depthColors: ReturnType<typeof resolveNavEditorDepthColors>;
	navBodyStyle: string;
	navTableLabels: NavigationTableLabels;
	navTargetOptions: NavTargetOptions;
	navTargetOptionsJson: string;
};

export function buildNavTreeSectionData(input: NavTreeSectionProps): NavTreeSectionData {
	const { navigation, categories, publishedPages, navEditorDepthColors } = input;
	const pageOptions = mergePageOptionsForNavEditor(
		publishedPages,
		collectNavInternalPageOptions(navigation),
	);
	const rows =
		navigation.length > 0
			? flattenNavigation(navigation, categories, pageOptions)
			: [{
					label: '',
					depth: 0,
					parentRowIndex: null,
					hrefKind: 'none' as const,
					hrefValue: '',
					menuColumns: 1 as const,
					menuColumnWidth0: '',
					menuColumnWidth1: '',
				}];

	const parentRowMeta = rows.map((row) => ({ label: row.label, depth: row.depth }));

	const categoryOptions = buildCategoryLinkOptions(categories);
	const navigationJsonPreview =
		navigation.length > 0 ? `${JSON.stringify(navigation, null, '\t')}\n` : '';

	const depthLabels = adminLayout.navDepthLabels;
	const depthColors = resolveNavEditorDepthColors(navEditorDepthColors);
	const navBodyStyle = navEditorDepthColorsToStyle(depthColors);
	const navTableLabels: NavigationTableLabels = {
		remove: adminLayout.actions.removeNavRow,
		edit: adminLayout.actions.editNavRow,
		closeEdit: ui.actions.close,
		depth0: depthLabels[0],
		depth1: depthLabels[1],
		depth2: depthLabels[2],
		menuColumnOne: adminLayout.navMenuColumnOptions.one,
		menuColumnTwo: adminLayout.navMenuColumnOptions.two,
		menuColumnsHint: adminLayout.navMenuColumnsHint,
		addNavChild: adminLayout.actions.addNavChild,
		navParentRoot: adminLayout.navParentRoot,
		navParentMissing: adminLayout.navParentMissing,
		navParentPrefix: 'pod:',
		hrefKinds: adminLayout.navHrefKinds,
		fieldLabels: {
			navDepth: adminLayout.fields.navDepth,
			navParent: adminLayout.fields.navParent,
			navLabel: adminLayout.fields.navLabel,
			navLinkType: adminLayout.fields.navLinkType,
			navLinkTarget: adminLayout.fields.navLinkTarget,
			navMenuColumns: adminLayout.fields.navMenuColumns,
			navMenuColumnCount: adminLayout.fields.navMenuColumnCount,
			navMenuColumnWidth1: adminLayout.fields.navMenuColumnWidth1,
			navMenuColumnWidth2: adminLayout.fields.navMenuColumnWidth2,
		},
	};
	const navTargetOptions = buildNavTargetOptions(categoryOptions, pageOptions, {
		emptyCategory: adminLayout.noCategoriesForNav,
		emptyPage: adminLayout.noPublishedPages,
	});
	const navTargetOptionsJson = JSON.stringify(navTargetOptions);

	return {
		rows,
		parentRowMeta,
		navigationJsonPreview,
		depthLabels,
		depthColors,
		navBodyStyle,
		navTableLabels,
		navTargetOptions,
		navTargetOptionsJson,
	};
}
