import type { CategoryDefinition, NavItem } from '@/lib/astro-layout/types';
import { isExternalHref, normalizeInternalHref } from '@/lib/astro-layout/validate-nav';
import type { PageOption } from '@/lib/admin/link-options';
import { STATIC_ROUTE_OPTIONS } from '@/lib/admin/link-options';

export type NavHrefKind = 'none' | 'category' | 'page' | 'static' | 'custom' | 'external';

export type FlatNavRow = {
	label: string;
	depth: number;
	parentRowIndex: number | null;
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

export function collectNavInternalPageOptions(items: NavItem[]): PageOption[] {
	const byPath = new Map<string, string>();

	function walk(nodes: NavItem[]) {
		for (const item of nodes) {
			if (item.href?.trim() && !isExternalHref(item.href)) {
				const path = normalizeInternalHref(item.href);
				byPath.set(path, item.label);
			}
			if (item.children?.length) walk(item.children);
		}
	}

	walk(items);
	return [...byPath.entries()].map(([path, title]) => ({ path, title }));
}

export function eligibleNavParentIndices(
	rows: { label: string; depth: number }[],
	rowIndex: number,
	depth: number,
): number[] {
	if (depth <= 0) return [];
	const targetDepth = depth - 1;
	const indices: number[] = [];
	for (let i = 0; i < rowIndex; i++) {
		if (rows[i]!.depth === targetDepth) indices.push(i);
	}
	return indices;
}

export function formatNavParentOptionLabel(label: string, rowNumber: number): string {
	const trimmed = label.trim() || `Wiersz ${rowNumber}`;
	return `${trimmed} (#${rowNumber})`;
}

export function computeNavRowOrder(
	rows: { depth: number; parentRowIndex: number | null }[],
): number[] {
	const result: number[] = [];
	const used = new Set<number>();

	function walk(parentIndex: number | null, expectedDepth: number): void {
		const candidates: number[] = [];
		for (let i = 0; i < rows.length; i++) {
			if (used.has(i)) continue;
			const row = rows[i]!;
			if (expectedDepth === 0) {
				if (row.depth === 0) candidates.push(i);
			} else if (row.parentRowIndex === parentIndex && row.depth === expectedDepth) {
				candidates.push(i);
			}
		}
		candidates.sort((a, b) => a - b);
		for (const index of candidates) {
			used.add(index);
			result.push(index);
			walk(index, rows[index]!.depth + 1);
		}
	}

	walk(null, 0);

	for (let i = 0; i < rows.length; i++) {
		if (!used.has(i)) result.push(i);
	}

	return result;
}

export function flattenNavigation(
	items: NavItem[],
	categories: CategoryDefinition[],
	publishedPages: PageOption[],
): FlatNavRow[] {
	const rows: FlatNavRow[] = [];

	function walk(nodes: NavItem[], depth: number, parentRowIndex: number | null) {
		for (const item of nodes) {
			const rowIndex = rows.length;
			const { kind, value } = detectNavHrefKind(item.href, categories, publishedPages);
			rows.push({
				label: item.label,
				depth,
				parentRowIndex: depth > 0 ? parentRowIndex : null,
				hrefKind: kind,
				hrefValue: value,
				isMegaMenu: depth === 0 && Boolean(item.isMegaMenu),
			});
			if (item.children?.length) {
				walk(item.children, depth + 1, rowIndex);
			}
		}
	}

	walk(items, 0, null);
	return rows;
}
