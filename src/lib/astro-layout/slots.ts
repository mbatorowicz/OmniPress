/** Predefiniowane „sloty” wyświetlania na stronie Astro (mapowanie kategoria → komponent). */
export const ASTRO_DISPLAY_SLOTS = [
	{
		id: 'home_pinned',
		label: 'Strona główna — przypięte wpisy',
		component: 'home.pinned',
	},
	{
		id: 'home_latest',
		label: 'Strona główna — najnowsze wpisy',
		component: 'home.latest',
	},
	{
		id: 'sidebar_feed',
		label: 'Sidebar — skróty / feed',
		component: 'sidebar.feed',
	},
] as const;

export type AstroDisplaySlotId = (typeof ASTRO_DISPLAY_SLOTS)[number]['id'];

export function defaultCategoryDisplays(): Record<AstroDisplaySlotId, string[]> {
	return {
		home_pinned: ['aktualnosci'],
		home_latest: ['aktualnosci'],
		sidebar_feed: [],
	};
}
