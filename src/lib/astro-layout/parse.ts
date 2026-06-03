import type { CategoryDefinition, CategoryDisplays, NavItem, SiteAstroLayout } from './types';
import { DEFAULT_CATEGORIES_PATH, DEFAULT_NAVIGATION_PATH, emptySiteAstroLayout } from './types';
import { defaultCategoryDisplays } from './slots';

function isNavItem(raw: unknown): raw is NavItem {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as NavItem;
	return typeof o.label === 'string';
}

export function parseNavigationJson(text: string): NavItem[] {
	const parsed = JSON.parse(text) as unknown;
	if (!Array.isArray(parsed)) throw new Error('Menu musi być tablicą JSON');
	if (!parsed.every(isNavItem)) throw new Error('Nieprawidłowy element menu');
	return parsed;
}

export function parseCategoriesFile(text: string): {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
} {
	const parsed = JSON.parse(text) as unknown;

	if (Array.isArray(parsed)) {
		return {
			categories: parsed
				.filter((r) => r && typeof r === 'object' && 'slug' in r && 'name' in r)
				.map((r) => ({
					slug: String((r as CategoryDefinition).slug),
					name: String((r as CategoryDefinition).name),
				})),
			displays: defaultCategoryDisplays(),
		};
	}

	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Nieprawidłowy plik kategorii');
	}

	const obj = parsed as {
		categories?: CategoryDefinition[];
		displays?: CategoryDisplays;
	};

	const categories = (obj.categories ?? [])
		.filter((c) => c?.slug && c?.name)
		.map((c) => ({ slug: String(c.slug), name: String(c.name) }));

	const displays = { ...defaultCategoryDisplays(), ...(obj.displays ?? {}) };

	return { categories, displays };
}

export function buildCategoriesFilePayload(layout: SiteAstroLayout): string {
	return `${JSON.stringify(
		{
			categories: layout.categories,
			displays: layout.categoryDisplays,
		},
		null,
		'\t',
	)}\n`;
}

export function buildNavigationFilePayload(navigation: NavItem[]): string {
	return `${JSON.stringify(navigation, null, '\t')}\n`;
}

export function normalizeSiteAstroLayout(raw: unknown): SiteAstroLayout {
	if (!raw || typeof raw !== 'object') return emptySiteAstroLayout();
	const o = raw as Partial<SiteAstroLayout>;
	return {
		navigation: Array.isArray(o.navigation) ? o.navigation : [],
		categoryDisplays: { ...defaultCategoryDisplays(), ...(o.categoryDisplays ?? {}) },
		categories: Array.isArray(o.categories) ? o.categories : [],
		navigationPath: o.navigationPath?.trim() || DEFAULT_NAVIGATION_PATH,
		categoriesPath: o.categoriesPath?.trim() || DEFAULT_CATEGORIES_PATH,
	};
}
