export type NavItem = {
	label: string;
	href?: string;
	isMegaMenu?: boolean;
	children?: NavItem[];
};

export type CategoryDefinition = {
	slug: string;
	name: string;
};

/** slotId → lista slugów kategorii widocznych w danym komponencie */
export type CategoryDisplays = Record<string, string[]>;

export type SiteAstroLayout = {
	navigation: NavItem[];
	categoryDisplays: CategoryDisplays;
	categories: CategoryDefinition[];
	navigationPath: string;
	categoriesPath: string;
};

export const DEFAULT_NAVIGATION_PATH = 'src/config/omnipress-navigation.json';
export const DEFAULT_CATEGORIES_PATH = 'src/config/omnipress-categories.json';

export function emptySiteAstroLayout(): SiteAstroLayout {
	return {
		navigation: [],
		categoryDisplays: {},
		categories: [],
		navigationPath: DEFAULT_NAVIGATION_PATH,
		categoriesPath: DEFAULT_CATEGORIES_PATH,
	};
}
