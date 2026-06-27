import type { CategoryDefinition } from '@/lib/astro-layout/types';

export type PageOption = { path: string; title: string };

export const STATIC_ROUTE_OPTIONS: PageOption[] = [
	{ path: '/', title: 'Strona główna' },
	{ path: '/kontakt', title: 'Kontakt' },
];

export function buildCategoryLinkOptions(categories: CategoryDefinition[]): PageOption[] {
	return categories.map((c) => ({ path: `/${c.slug}`, title: c.name }));
}

/** Łączy strony z bazy z adresami już występującymi w menu (np. po imporcie z GitHub). */
export function mergePageOptionsForNavEditor(
	publishedPages: PageOption[],
	extraPages: PageOption[],
): PageOption[] {
	const byPath = new Map<string, PageOption>();
	for (const page of publishedPages) byPath.set(page.path, page);
	for (const page of extraPages) {
		if (!byPath.has(page.path)) byPath.set(page.path, page);
	}
	return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, 'pl'));
}
