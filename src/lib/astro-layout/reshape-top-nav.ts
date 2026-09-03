import type { NavItem } from './types';
import { isExternalHref, normalizeInternalHref } from './validate-nav';

export const DEAD_TOP_NAV_HREFS = [
	'/gmina/gops',
	'/gmina/biblioteka',
	'/gmina/druki',
] as const;

/** Klucz = href albo etykieta grupy bez href. Bez polskich znakow — SSOT i18n. */
export const TOP_NAV_LEVEL1_KEYS = [
	'/aktualnosci',
	'Gmina',
	'Gospodarka odpadami',
	'/ochrona-ludnosci',
	'Kontakt',
	'BIP',
] as const;

function hrefKey(href: string | undefined): string | null {
	if (!href?.trim()) return null;
	if (isExternalHref(href)) return href.trim();
	return normalizeInternalHref(href);
}

function level1Key(item: NavItem): string {
	return hrefKey(item.href) ?? item.label;
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
	const rank = new Map<string, number>(TOP_NAV_LEVEL1_KEYS.map((key, index) => [key, index]));
	return [...items].sort((a, b) => {
		const left = rank.get(level1Key(a)) ?? TOP_NAV_LEVEL1_KEYS.length;
		const right = rank.get(level1Key(b)) ?? TOP_NAV_LEVEL1_KEYS.length;
		return left - right;
	});
}

export function reshapeTopNav(navigation: NavItem[], ensureLeaves: NavItem[] = []): NavItem[] {
	const next = navigation
		.map((item) => reshapeItem(item, 0))
		.filter((item): item is NavItem => item !== null);
	let withLeaves = next;
	for (const leaf of ensureLeaves) {
		if (!hasItem(withLeaves, leaf)) withLeaves = [...withLeaves, leaf];
	}
	return sortLevel1(withLeaves);
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
