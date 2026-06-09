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
	/** Kolejność w sidebarze (mniejsza = wyżej); dotyczy widgetów globalnych i slotów sidebar.* */
	order?: number;
	/** true = tylko przypięte, false = tylko nieprzypięte, brak = wszystkie */
	pinnedOnly?: boolean;
	/** sidebar.weather — TERYT powiatu (4 cyfry) */
	terytPowiat?: string;
	/** sidebar.weather — centrum mapy */
	mapCenter?: { lat: number; lon: number };
	/** sidebar.weather — zoom mapy Leaflet */
	mapZoom?: number;
	/** sidebar.weather — czy renderować mini-mapę */
	showMap?: boolean;
	/** sidebar.weather — sąsiednie powiaty na mapie (kody TERYT) */
	mapScopePowiaty?: string[];
};

export type WeatherSlotWidgetConfig = SlotWidgetConfig & {
	terytPowiat: string;
	mapCenter: { lat: number; lon: number };
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

export type SidebarBannerLinkType = 'category' | 'page' | 'external';

export type SidebarBanner = {
	id: string;
	/** Tekst alternatywny / etykieta dostępności */
	label: string;
	style: 'image' | 'text';
	imageUrl?: string;
	imageVariant?: 'default' | 'blue';
	textTitle?: string;
	textButton?: string;
	linkType: SidebarBannerLinkType;
	categorySlug?: string;
	pagePath?: string;
	externalUrl?: string;
	order?: number;
	enabled?: boolean;
};

export type SiteAstroLayout = {
	navigation: NavItem[];
	categoryDisplays: CategoryDisplays;
	categories: CategoryDefinition[];
	slots: DisplaySlot[];
	widgets: SiteWidgetsConfig;
	banners: SidebarBanner[];
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
		banners: [],
		navigationPath: DEFAULT_NAVIGATION_PATH,
		categoriesPath: DEFAULT_CATEGORIES_PATH,
	};
}
