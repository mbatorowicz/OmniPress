import type { CategoryDefinition } from '@/lib/astro-layout/types';

export type PageOption = { path: string; title: string };

export const STATIC_ROUTE_OPTIONS: PageOption[] = [
	{ path: '/', title: 'Strona główna' },
	{ path: '/kontakt', title: 'Kontakt' },
];

export function buildCategoryLinkOptions(categories: CategoryDefinition[]): PageOption[] {
	return categories.map((c) => ({ path: `/${c.slug}`, title: c.name }));
}
