export type LayoutComponentKind =
	| 'home_feed'
	| 'recent_changes'
	| 'cert'
	| 'weather'
	| 'banner';

export const LAYOUT_COMPONENT_KINDS = [
	'home_feed',
	'recent_changes',
	'cert',
	'weather',
	'banner',
] as const satisfies readonly LayoutComponentKind[];

export const LAYOUT_COMPONENTS = {
	'home.pinned': { kind: 'home_feed', area: 'home', singleton: false, categoryFeed: true },
	'home.latest': { kind: 'home_feed', area: 'home', singleton: false, categoryFeed: true },
	'sidebar.weather': { kind: 'weather', area: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.recent_changes': {
		kind: 'recent_changes',
		area: 'sidebar',
		singleton: true,
		categoryFeed: false,
	},
	'sidebar.cert_advisories': { kind: 'cert', area: 'sidebar', singleton: true, categoryFeed: false },
	'sidebar.banner': { kind: 'banner', area: 'sidebar', singleton: false, categoryFeed: false },
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

export function getComponentsOfKind(kind: LayoutComponentKind): LayoutComponentId[] {
	return LAYOUT_COMPONENT_IDS.filter((id) => LAYOUT_COMPONENTS[id].kind === kind);
}

export function isCategoryFeedComponent(component: string): boolean {
	return getComponentKind(component) === 'home_feed';
}

export function isSingletonComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].singleton;
}

export function isSidebarComponent(component: string): boolean {
	return isLayoutComponentId(component) && LAYOUT_COMPONENTS[component].area === 'sidebar';
}

/** Komponenty z pustym stanem (tekst „Brak…”) — obsługa hideWhenEmpty */
export function supportsHideWhenEmpty(component: string): boolean {
	const kind = getComponentKind(component);
	return kind !== null && kind !== 'banner';
}
