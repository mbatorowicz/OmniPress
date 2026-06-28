import type { LayoutComponentId, LayoutZone } from './components';
import type { RecentChangeEntry } from '@/lib/recent-changes/types';

export type { RecentChangeEntry };

export type NavItem = {
	label: string;
	href?: string;
	/** @deprecated czytane przy imporcie — zapis jako menuColumns */
	isMegaMenu?: boolean;
	menuColumns?: 1 | 2;
	menuColumnWidths?: string[];
	children?: NavItem[];
};

export type CategoryArchiveLayout = 'tiles' | 'title-list';
export type CategoryArchiveColumns = 1 | 2 | 3;

export type CategoryDefinition = {
	slug: string;
	name: string;
	archiveLayout?: CategoryArchiveLayout;
	archiveColumns?: CategoryArchiveColumns;
};

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

export type LocalFeedWidgetConfig = FeedListWidget;

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

export type SiteMetaWidgetConfig = BaseSlotWidget & {
	name?: string;
	description?: string;
	url?: string;
};

export type TopbarWidgetConfig = BaseSlotWidget & {
	text?: string;
	/** Narzędzia WCAG (kontrast, czcionka) — domyślnie włączone */
	accessibilityTools?: boolean;
};

export type HeaderBrandWidgetConfig = BaseSlotWidget & {
	logoUrl?: string;
	logoAlt?: string;
	homeHref?: string;
};

export type NavigationWidgetConfig = BaseSlotWidget & {
	navigation?: NavItem[];
};

export type FooterContactBlock = {
	addressLine1?: string;
	addressLine2?: string;
	phones?: string[];
	email?: string;
	nip?: string;
	regon?: string;
	epuap?: string;
	eDoreczenia?: string;
};

export type FooterBankAccount = {
	name?: string;
	number?: string;
};

export type FooterOfficeHours = {
	day?: string;
	hours?: string;
};

export type FooterInvoiceParty = {
	title?: string;
	name?: string;
	address?: string;
	nip?: string;
};

export type FooterLegalLink = {
	label: string;
	href: string;
};

export type FooterMainWidgetConfig = BaseSlotWidget & {
	contact?: FooterContactBlock;
	bankAccounts?: FooterBankAccount[];
	officeHours?: FooterOfficeHours[];
	invoiceData?: {
		buyer?: FooterInvoiceParty;
		recipient?: FooterInvoiceParty;
	};
	legalLinks?: FooterLegalLink[];
	copyrightSuffix?: string;
	contactCtaLabel?: string;
	contactCtaHref?: string;
};

export type SlotWidgetConfig = HomeFeedWidgetConfig &
	LocalFeedWidgetConfig &
	CertAdvisoriesWidgetConfig &
	WeatherSlotWidgetConfig &
	BannerWidgetConfig &
	SiteMetaWidgetConfig &
	TopbarWidgetConfig &
	HeaderBrandWidgetConfig &
	NavigationWidgetConfig &
	FooterMainWidgetConfig;

export type DisplaySlot = {
	id: string;
	label: string;
	component: LayoutComponentId | string;
	widget?: SlotWidgetConfig;
	entries?: RecentChangeEntry[];
};

export type LayoutZoneSection = {
	components: DisplaySlot[];
};

export type LayoutZonesMap = Record<LayoutZone, LayoutZoneSection>;

export type LayoutContract = 'unified' | 'legacy' | 'zones_v2';

export type LayoutSyncMeta = {
	lastDraftSavedAt?: string;
	lastPublishedAt?: string;
	lastPublishedSha?: string;
	/** @deprecated użyj publishedLayoutHash */
	publishedNavHash?: string;
	/** @deprecated użyj publishedLayoutHash */
	publishedCategoriesHash?: string;
	publishedLayoutHash?: string;
	/** Git blob SHA pliku layoutu na GitHub po ostatniej publikacji */
	publishedLiveBlobSha?: string;
	layoutContract?: LayoutContract;
};

export type NavEditorDepthColor = {
	accent: string;
};

export type NavEditorDepthColors = [NavEditorDepthColor, NavEditorDepthColor, NavEditorDepthColor];

export type SiteAstroLayout = {
	/** @deprecated treść w slocie header.navigation — utrzymywane dla kompatybilności edytora */
	navigation: NavItem[];
	categoryDisplays: CategoryDisplays;
	categories: CategoryDefinition[];
	/** Strefy layoutu — SSOT (zones_v2) */
	zones: LayoutZonesMap;
	/** Pochodne z zones — utrzymywane w sync dla kodu przejściowego */
	slots: DisplaySlot[];
	layoutPath: string;
	/** @deprecated użyj layoutPath */
	navigationPath: string;
	/** @deprecated użyj layoutPath */
	categoriesPath: string;
	navEditorDepthColors?: NavEditorDepthColors;
	sync?: LayoutSyncMeta;
};

export const DEFAULT_LAYOUT_PATH = 'src/config/omnipress-layout.json';
/** @deprecated */
export const DEFAULT_NAVIGATION_PATH = 'src/config/omnipress-navigation.json';
/** @deprecated */
export const DEFAULT_CATEGORIES_PATH = 'src/config/omnipress-categories.json';

import { emptyZones } from './zones';

export function emptySiteAstroLayout(): SiteAstroLayout {
	return {
		navigation: [],
		categoryDisplays: {},
		categories: [],
		zones: emptyZones(),
		slots: [],
		layoutPath: DEFAULT_LAYOUT_PATH,
		navigationPath: DEFAULT_NAVIGATION_PATH,
		categoriesPath: DEFAULT_CATEGORIES_PATH,
	};
}
