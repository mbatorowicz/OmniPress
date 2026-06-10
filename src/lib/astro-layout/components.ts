export const LAYOUT_COMPONENTS = {
	'home.pinned': { area: 'home', singleton: false, categoryFeed: true },
	'home.latest': { area: 'home', singleton: false, categoryFeed: true },
	'sidebar.weather': { area: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.recent_changes': { area: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.cert_advisories': { area: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.banner': { area: 'sidebar', singleton: false, categoryFeed: false },
} as const;

export type LayoutComponentId = keyof typeof LAYOUT_COMPONENTS;

export const LAYOUT_COMPONENT_IDS = Object.keys(LAYOUT_COMPONENTS) as LayoutComponentId[];

export function isLayoutComponentId(raw: string): raw is LayoutComponentId {
	return raw in LAYOUT_COMPONENTS;
}

export function isCategoryFeedComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].categoryFeed;
}

export function isSingletonComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].singleton;
}

export function isSidebarComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].area === 'sidebar';
}

/** Komponenty z pustym stanem (tekst „Brak…”) — obsługa hideWhenEmpty */
export function supportsHideWhenEmpty(component: string): boolean {
	return isLayoutComponentId(component) && component !== 'sidebar.banner';
}
