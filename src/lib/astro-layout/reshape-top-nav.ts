import type { NavItem } from './types';
import { isExternalHref, normalizeInternalHref } from './validate-nav';

export const DEAD_TOP_NAV_HREFS = [
	'/gmina/gops',
	'/gmina/biblioteka',
	'/gmina/druki',
] as const;

export const TOP_NAV_LEVEL1_ORDER = [
	'Aktualności',
	'Gmina',
	'Gospodarka odpadami',
	'Ochrona ludności',
	'Kontakt',
	'BIP',
] as const;

const AKTUALNOSCI: NavItem = { href: '/aktualnosci', label: 'Aktualności' };
const OCHRONA_LUDNOSCI: NavItem = { href: '/ochrona-ludnosci', label: 'Ochrona ludności' };

function hrefKey(href: string | undefined): string | null {
	if (!href?.trim()) return null;
	if (isExternalHref(href)) return href.trim();
	return normalizeInternalHref(href);
}

function isDeadHref(href: string | undefined): boolean {
	const key = hrefKey(href);
	return key !== null && (DEAD_TOP_NAV_HREFS as readonly string[]).includes(key);
}

function reshapeItem(item: NavItem, depth: number): NavItem | null {
	if (isDeadHref(item.href)) return null;

	if (!item.children?.length) {
		return item.href?.trim() ? item : null;
	}

	const children = item.children
		.map((child) => reshapeItem(child, depth + 1))
		.filter((child): child is NavItem => child !== null);

	if (children.length > 1) {
		const unchanged =
			children.length === item.children.length &&
			children.every((child, index) => child === item.children![index]);
		return unchanged ? item : { ...item, children };
	}

	if (children.length === 1) {
		if (depth > 0 && !item.href?.trim()) return children[0]!;
		return { ...item, children };
	}

	if (!item.href?.trim()) return null;
	const { children: _dropped, ...leaf } = item;
	return leaf;
}

function hasItem(items: NavItem[], incoming: NavItem): boolean {
	const incomingHref = hrefKey(incoming.href);
	return items.some(
		(item) => item.label === incoming.label || hrefKey(item.href) === incomingHref,
	);
}

function sortLevel1(items: NavItem[]): NavItem[] {
	const rank = new Map<string, number>(TOP_NAV_LEVEL1_ORDER.map((label, index) => [label, index]));
	return [...items].sort((a, b) => {
		const left = rank.get(a.label) ?? TOP_NAV_LEVEL1_ORDER.length;
		const right = rank.get(b.label) ?? TOP_NAV_LEVEL1_ORDER.length;
		return left - right;
	});
}

export function reshapeTopNav(navigation: NavItem[]): NavItem[] {
	const next = navigation
		.map((item) => reshapeItem(item, 0))
		.filter((item): item is NavItem => item !== null);
	const withNews = hasItem(next, AKTUALNOSCI) ? next : [...next, AKTUALNOSCI];
	const withBoth = hasItem(withNews, OCHRONA_LUDNOSCI) ? withNews : [...withNews, OCHRONA_LUDNOSCI];
	return sortLevel1(withBoth);
}

export function collectInternalNavHrefs(navigation: NavItem[]): string[] {
	const hrefs: string[] = [];

	function walk(items: NavItem[]) {
		for (const item of items) {
			const key = hrefKey(item.href);
			if (key && item.href && !isExternalHref(item.href)) hrefs.push(key);
			if (item.children) walk(item.children);
		}
	}

	walk(navigation);
	return hrefs;
}
