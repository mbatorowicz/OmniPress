import type { CategoryOption } from './types';

export function mergeCategoryLists(lists: CategoryOption[][]): CategoryOption[] {
	const map = new Map<string, CategoryOption>();

	for (const list of lists) {
		for (const item of list) {
			const key = item.slug.toLowerCase();
			const existing = map.get(key);
			if (!existing) {
				map.set(key, { ...item, sources: [...item.sources] });
				continue;
			}
			const sources = new Set([...existing.sources, ...item.sources]);
			map.set(key, {
				slug: existing.slug,
				name: existing.name || item.name,
				sources: [...sources],
			});
		}
	}

	return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export function findCategoryBySlug(
	categories: CategoryOption[],
	slug: string,
): CategoryOption | null {
	const key = slug.trim().toLowerCase();
	return categories.find((c) => c.slug.toLowerCase() === key) ?? null;
}
