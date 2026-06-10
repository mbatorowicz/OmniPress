import type { LayoutComponentId } from './components';

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

export type BannerLinkType = 'category' | 'page' | 'external';

export type SlotWidgetConfig = {
	title?: string;
	sectionTitle?: string;
	limit?: number;
	emptyText?: string;
	/** Ukryj cały widget/sekcję, gdy brak wpisów lub ostrzeżeń */
	hideWhenEmpty?: boolean;
	enabled?: boolean;
	variant?: 'default' | 'alert';
	moreLink?: string;
	/** Kolejność (mniejsza = wyżej); sidebar.* i home.* */
	order?: number;
	pinnedOnly?: boolean;
	/** sidebar.cert_advisories */
	categoryFilter?: string;
	/** sidebar.weather — kod powiatu (4 cyfry), np. 1433 = węgrowski */
	terytPowiat?: string;
	/** sidebar.weather — kod gminy (7 cyfr), np. 1433062 = Miedzna; metadane / marker mapy */
	terytGmina?: string;
	mapCenter?: { lat: number; lon: number };
	mapZoom?: number;
	showMap?: boolean;
	mapScopePowiaty?: string[];
	detailsDisplay?: 'modal' | 'inline';
	detailsLayout?: 'stacked' | 'grid';
	detailsSummary?: string;
	detailsCloseLabel?: string;
	/** sidebar.banner — alt; domyślnie slot.label */
	bannerLabel?: string;
	style?: 'image' | 'text';
	imageUrl?: string;
	imageVariant?: 'default' | 'blue';
	textTitle?: string;
	textButton?: string;
	linkType?: BannerLinkType;
	categorySlug?: string;
	pagePath?: string;
	externalUrl?: string;
};

export type WeatherSlotWidgetConfig = SlotWidgetConfig & {
	terytPowiat: string;
	mapCenter: { lat: number; lon: number };
};

export type DisplaySlot = {
	id: string;
	label: string;
	component: LayoutComponentId | string;
	widget?: SlotWidgetConfig;
};

export type CertAdvisoriesWidgetConfig = SlotWidgetConfig;

export type SiteAstroLayout = {
	navigation: NavItem[];
	categoryDisplays: CategoryDisplays;
	categories: CategoryDefinition[];
	slots: DisplaySlot[];
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
		navigationPath: DEFAULT_NAVIGATION_PATH,
		categoriesPath: DEFAULT_CATEGORIES_PATH,
	};
}
