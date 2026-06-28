export type LayoutZone = 'topbar' | 'header' | 'home' | 'sidebar' | 'footer' | 'site';

export type LayoutComponentKind =
	| 'chrome'
	| 'navigation'
	| 'home_feed'
	| 'live_feed'
	| 'local_feed'
	| 'banner';

export const LAYOUT_COMPONENT_KINDS = [
	'chrome',
	'navigation',
	'home_feed',
	'live_feed',
	'local_feed',
	'banner',
] as const satisfies readonly LayoutComponentKind[];

export const LAYOUT_ZONE_ORDER: LayoutZone[] = [
	'site',
	'topbar',
	'header',
	'home',
	'sidebar',
	'footer',
];

/** Kolejność stref w edytorze layoutu (zgodna z renderem strony). */
export const LAYOUT_EDITOR_ZONE_ORDER: LayoutZone[] = [
	'topbar',
	'header',
	'home',
	'sidebar',
	'footer',
	'site',
];

type LayoutComponentDef = {
	kind: LayoutComponentKind;
	defaultZone: LayoutZone;
	allowedZones: readonly LayoutZone[];
	singleton: boolean;
	categoryFeed: boolean;
};

function zoneOnly(zone: LayoutZone): readonly LayoutZone[] {
	return [zone];
}

export const LAYOUT_COMPONENTS = {
	'site.meta': {
		kind: 'chrome',
		defaultZone: 'site',
		allowedZones: zoneOnly('site'),
		singleton: true,
		categoryFeed: false,
	},
	'topbar.tagline': {
		kind: 'chrome',
		defaultZone: 'topbar',
		allowedZones: zoneOnly('topbar'),
		singleton: true,
		categoryFeed: false,
	},
	'header.brand': {
		kind: 'chrome',
		defaultZone: 'header',
		allowedZones: zoneOnly('header'),
		singleton: true,
		categoryFeed: false,
	},
	'header.navigation': {
		kind: 'navigation',
		defaultZone: 'header',
		allowedZones: zoneOnly('header'),
		singleton: true,
		categoryFeed: false,
	},
	'home.pinned': {
		kind: 'home_feed',
		defaultZone: 'home',
		allowedZones: zoneOnly('home'),
		singleton: false,
		categoryFeed: true,
	},
	'home.latest': {
		kind: 'home_feed',
		defaultZone: 'home',
		allowedZones: zoneOnly('home'),
		singleton: false,
		categoryFeed: true,
	},
	'sidebar.weather': {
		kind: 'live_feed',
		defaultZone: 'sidebar',
		allowedZones: ['sidebar', 'footer'],
		singleton: true,
		categoryFeed: false,
	},
	'sidebar.cert_advisories': {
		kind: 'live_feed',
		defaultZone: 'sidebar',
		allowedZones: ['sidebar', 'footer'],
		singleton: true,
		categoryFeed: false,
	},
	'sidebar.recent_changes': {
		kind: 'local_feed',
		defaultZone: 'sidebar',
		allowedZones: zoneOnly('sidebar'),
		singleton: true,
		categoryFeed: false,
	},
	'sidebar.banner': {
		kind: 'banner',
		defaultZone: 'sidebar',
		allowedZones: ['sidebar', 'footer', 'home'],
		singleton: false,
		categoryFeed: false,
	},
	'footer.main': {
		kind: 'chrome',
		defaultZone: 'footer',
		allowedZones: zoneOnly('footer'),
		singleton: true,
		categoryFeed: false,
	},
} as const satisfies Record<string, LayoutComponentDef>;

export type LayoutComponentId = keyof typeof LAYOUT_COMPONENTS;

export const LAYOUT_COMPONENT_IDS = Object.keys(LAYOUT_COMPONENTS) as LayoutComponentId[];

export function isLayoutComponentId(raw: string): raw is LayoutComponentId {
	return raw in LAYOUT_COMPONENTS;
}

export function getComponentKind(component: string): LayoutComponentKind | null {
	if (!isLayoutComponentId(component)) return null;
	return LAYOUT_COMPONENTS[component].kind;
}

export function getDefaultComponentZone(component: string): LayoutZone | null {
	if (!isLayoutComponentId(component)) return null;
	return LAYOUT_COMPONENTS[component].defaultZone;
}

/** @deprecated użyj getDefaultComponentZone — strefa domyślna przy migracji legacy */
export function getComponentZone(component: string): LayoutZone | null {
	return getDefaultComponentZone(component);
}

export function getAllowedZones(component: string): LayoutZone[] {
	if (!isLayoutComponentId(component)) return [];
	return [...LAYOUT_COMPONENTS[component].allowedZones];
}

export function isComponentAllowedInZone(component: string, zone: LayoutZone): boolean {
	return getAllowedZones(component).includes(zone);
}

export function getComponentsAddableInZone(zone: LayoutZone): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => isComponentAllowedInZone(id, zone));
}

export function getComponentsOfKind(kind: LayoutComponentKind): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].kind === kind);
}

/** Komponenty z domyślną strefą — do grupowania legacy / migracji */
export function getComponentsOfZone(zone: LayoutZone): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].defaultZone === zone);
}

export function isCategoryFeedComponent(component: string): boolean {
	return getComponentKind(component) === 'home_feed';
}

export function isSingletonComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].singleton;
}

export function isSidebarComponent(component: string): boolean {
	return getDefaultComponentZone(component) === 'sidebar';
}

/** Komponenty z pustym stanem (tekst „Brak…”) — obsługa hideWhenEmpty */
export function supportsHideWhenEmpty(component: string): boolean {
	const kind = getComponentKind(component);
	return kind !== null && kind !== 'banner' && kind !== 'chrome' && kind !== 'navigation';
}

export function getSingletonComponentIds(): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].singleton);
}

export function zoneSupportsAddComponent(zone: LayoutZone): boolean {
	return getComponentsAddableInZone(zone).length > 0;
}

const CHROME_SETTINGS_COMPONENTS = new Set<LayoutComponentId>([
	'topbar.tagline',
	'site.meta',
	'header.brand',
	'footer.main',
]);

export function slotHasSettingsPanel(component: string): boolean {
	if (!isLayoutComponentId(component)) return false;
	if (component === 'header.navigation') return false;
	const kind = getComponentKind(component);
	if (kind === 'navigation') return false;
	if (kind === 'home_feed' || kind === 'local_feed' || kind === 'live_feed' || kind === 'banner') {
		return true;
	}
	if (kind === 'chrome') return CHROME_SETTINGS_COMPONENTS.has(component);
	return false;
}
