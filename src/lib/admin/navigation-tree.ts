import type { CategoryDefinition, NavItem } from '@/lib/astro-layout/types';
import { isExternalHref, normalizeInternalHref } from '@/lib/astro-layout/validate-nav';
import type { PageOption } from '@/lib/admin/link-options';
import { STATIC_ROUTE_OPTIONS } from '@/lib/admin/link-options';

export type NavHrefKind = 'none' | 'category' | 'page' | 'static' | 'custom' | 'external';

export type FlatNavRow = {
	label: string;
	depth: number;
	hrefKind: NavHrefKind;
	hrefValue: string;
	isMegaMenu: boolean;
};

export function detectNavHrefKind(
	href: string | undefined,
	categories: CategoryDefinition[],
	publishedPages: PageOption[],
): { kind: NavHrefKind; value: string } {
	if (!href?.trim()) return { kind: 'none', value: '' };
	const trimmed = href.trim();
	if (isExternalHref(trimmed)) return { kind: 'external', value: trimmed };

	const normalized = normalizeInternalHref(trimmed);
	if (STATIC_ROUTE_OPTIONS.some((o) => o.path === normalized)) {
		return { kind: 'static', value: normalized };
	}
	const cat = categories.find((c) => normalizeInternalHref(`/${c.slug}`) === normalized);
	if (cat) return { kind: 'category', value: cat.slug };
	const page = publishedPages.find((p) => normalizeInternalHref(p.path) === normalized);
	if (page) return { kind: 'page', value: normalized };
	return { kind: 'custom', value: normalized };
}

export function flattenNavigation(
	items: NavItem[],
	categories: CategoryDefinition[],
	publishedPages: PageOption[],
	depth = 0,
): FlatNavRow[] {
	const rows: FlatNavRow[] = [];
	for (const item of items) {
		const { kind, value } = detectNavHrefKind(item.href, categories, publishedPages);
		rows.push({
			label: item.label,
			depth,
			hrefKind: kind,
			hrefValue: value,
			isMegaMenu: depth === 0 && Boolean(item.isMegaMenu),
		});
		if (item.children?.length) {
			rows.push(...flattenNavigation(item.children, categories, publishedPages, depth + 1));
		}
	}
	return rows;
}
