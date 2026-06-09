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

export type SlotWidgetConfig = {
	title?: string;
	sectionTitle?: string;
	limit?: number;
	emptyText?: string;
	enabled?: boolean;
	variant?: 'default' | 'alert';
	moreLink?: string;
	/** true = tylko przypięte, false = tylko nieprzypięte, brak = wszystkie */
	pinnedOnly?: boolean;
};

export type DisplaySlot = {
	id: string;
	label: string;
	component: string;
	widget?: SlotWidgetConfig;
};

export type CertAdvisoriesWidgetConfig = SlotWidgetConfig & {
	/** Filtr kategorii CERT (np. „Dla użytkowników”); brak = wszystkie */
	categoryFilter?: string;
};

export type SiteWidgetsConfig = {
	recent_changes?: SlotWidgetConfig;
	cert_advisories?: CertAdvisoriesWidgetConfig;
};

export type SiteAstroLayout = {
	navigation: NavItem[];
	categoryDisplays: CategoryDisplays;
	categories: CategoryDefinition[];
	slots: DisplaySlot[];
	widgets: SiteWidgetsConfig;
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
		slots: [],
		widgets: {},
		navigationPath: DEFAULT_NAVIGATION_PATH,
		categoriesPath: DEFAULT_CATEGORIES_PATH,
	};
}
