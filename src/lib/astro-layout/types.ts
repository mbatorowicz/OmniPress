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

export type BaseSlotWidget = {
	order?: number;
	enabled?: boolean;
};

export type FeedListWidget = BaseSlotWidget & {
	title?: string;
	limit?: number;
	emptyText?: string;
	hideWhenEmpty?: boolean;
	variant?: 'default' | 'alert';
};

export type HomeFeedWidgetConfig = FeedListWidget & {
	sectionTitle?: string;
	moreLink?: string;
	pinnedOnly?: boolean;
};

export type RecentChangesWidgetConfig = FeedListWidget;

export type CertAdvisoriesWidgetConfig = FeedListWidget & {
	categoryFilter?: string;
};

export type WeatherSlotWidgetConfig = BaseSlotWidget & {
	title?: string;
	emptyText?: string;
	hideWhenEmpty?: boolean;
	terytPowiat?: string;
	terytGmina?: string;
	mapCenter?: { lat: number; lon: number };
	mapZoom?: number;
	showMap?: boolean;
	mapScopePowiaty?: string[];
	detailsDisplay?: 'modal' | 'inline';
	detailsLayout?: 'stacked' | 'grid';
	detailsSummary?: string;
	detailsCloseLabel?: string;
};

export type BannerWidgetConfig = BaseSlotWidget & {
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

/** Płaski obiekt w JSON — suma pól wszystkich typów widgetów */
export type SlotWidgetConfig = HomeFeedWidgetConfig &
	RecentChangesWidgetConfig &
	CertAdvisoriesWidgetConfig &
	WeatherSlotWidgetConfig &
	BannerWidgetConfig;

export type DisplaySlot = {
	id: string;
	label: string;
	component: LayoutComponentId | string;
	widget?: SlotWidgetConfig;
};

/** Metadane szkicu vs opublikowany layout w repo GitHub */
export type LayoutSyncMeta = {
	lastDraftSavedAt?: string;
	lastPublishedAt?: string;
	lastPublishedSha?: string;
	publishedNavHash?: string;
	publishedCategoriesHash?: string;
};

export type NavEditorDepthColor = {
	accent: string;
};

export type NavEditorDepthColors = [NavEditorDepthColor, NavEditorDepthColor, NavEditorDepthColor];

export type SiteAstroLayout = {
	navigation: NavItem[];
	categoryDisplays: CategoryDisplays;
	categories: CategoryDefinition[];
	slots: DisplaySlot[];
	navigationPath: string;
	categoriesPath: string;
	/** Kolory kafelków edytora menu (poziom 0–2) — tylko panel admina */
	navEditorDepthColors?: NavEditorDepthColors;
	sync?: LayoutSyncMeta;
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
