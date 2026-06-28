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

export const LAYOUT_COMPONENTS = {
	'site.meta': { kind: 'chrome', zone: 'site', singleton: true, categoryFeed: false },
	'topbar.tagline': { kind: 'chrome', zone: 'topbar', singleton: true, categoryFeed: false },
	'header.brand': { kind: 'chrome', zone: 'header', singleton: true, categoryFeed: false },
	'header.navigation': { kind: 'navigation', zone: 'header', singleton: true, categoryFeed: false },
	'home.pinned': { kind: 'home_feed', zone: 'home', singleton: false, categoryFeed: true },
	'home.latest': { kind: 'home_feed', zone: 'home', singleton: false, categoryFeed: true },
	'sidebar.weather': { kind: 'live_feed', zone: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.cert_advisories': { kind: 'live_feed', zone: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.recent_changes': { kind: 'local_feed', zone: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.banner': { kind: 'banner', zone: 'sidebar', singleton: false, categoryFeed: false },
	'footer.main': { kind: 'chrome', zone: 'footer', singleton: true, categoryFeed: false },
} as const;

export type LayoutComponentId = keyof typeof LAYOUT_COMPONENTS;

export const LAYOUT_COMPONENT_IDS = Object.keys(LAYOUT_COMPONENTS) as LayoutComponentId[];

export function isLayoutComponentId(raw: string): raw is LayoutComponentId {
	return raw in LAYOUT_COMPONENTS;
}

export function getComponentKind(component: string): LayoutComponentKind | null {
	if (!isLayoutComponentId(component)) return null;
	return LAYOUT_COMPONENTS[component].kind;
}

export function getComponentZone(component: string): LayoutZone | null {
	if (!isLayoutComponentId(component)) return null;
	return LAYOUT_COMPONENTS[component].zone;
}

export function getComponentsOfKind(kind: LayoutComponentKind): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].kind === kind);
}

export function getComponentsOfZone(zone: LayoutZone): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].zone === zone);
}

export function isCategoryFeedComponent(component: string): boolean {
	return getComponentKind(component) === 'home_feed';
}

export function isSingletonComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].singleton;
}

export function isSidebarComponent(component: string): boolean {
	return getComponentZone(component) === 'sidebar';
}

/** Komponenty z pustym stanem (tekst „Brak…”) — obsługa hideWhenEmpty */
export function supportsHideWhenEmpty(component: string): boolean {
	const kind = getComponentKind(component);
	return kind !== null && kind !== 'banner' && kind !== 'chrome' && kind !== 'navigation';
}

export function getSingletonComponentIds(): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].singleton);
}
