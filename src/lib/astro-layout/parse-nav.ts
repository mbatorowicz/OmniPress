import type { NavItem } from './types';
import {
	readNavMenuColumns,
	sanitizeNavMenuColumnWidth,
} from '@/lib/admin/nav-dropdown-layout';

function isNavItem(raw: unknown): raw is NavItem {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as NavItem;
	return typeof o.label === 'string';
}

function normalizeNavItem(raw: unknown, isRoot = true): NavItem {
	const o = raw as NavItem;
	const item: NavItem = { label: String(o.label ?? '').trim() };
	if (typeof o.href === 'string' && o.href.trim()) item.href = o.href.trim();

	if (isRoot) {
		const columns =
			readNavMenuColumns(o.menuColumns) ?? (o.isMegaMenu === true ? 2 : undefined);
		if (columns === 2) item.menuColumns = 2;
		else if (columns === 1) item.menuColumns = 1;

		if (Array.isArray(o.menuColumnWidths)) {
			const widths = o.menuColumnWidths
				.filter((w): w is string => typeof w === 'string')
				.map((w) => sanitizeNavMenuColumnWidth(w))
				.filter((w): w is string => Boolean(w))
				.slice(0, 2);
			if (widths.length > 0) item.menuColumnWidths = widths;
		}
	}

	if (Array.isArray(o.children) && o.children.length > 0) {
		item.children = o.children.map((child) => normalizeNavItem(child, false));
	}
	return item;
}

function exportNavItem(item: NavItem, isRoot: boolean): NavItem {
	const out: NavItem = { label: item.label };
	if (item.href) out.href = item.href;

	if (isRoot && item.children?.length) {
		if (item.menuColumns === 2) out.menuColumns = 2;
		else if (item.menuColumns === 1) out.menuColumns = 1;
		if (item.menuColumnWidths?.length) {
			out.menuColumnWidths = item.menuColumnWidths
				.map(sanitizeNavMenuColumnWidth)
				.filter((width): width is string => Boolean(width))
				.slice(0, out.menuColumns === 2 ? 2 : 1);
		}
	}

	if (item.children?.length) {
		out.children = item.children.map((child) => exportNavItem(child, false));
	}
	return out;
}

export function normalizeNavItems(raw: unknown): NavItem[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(isNavItem).map((item) => normalizeNavItem(item, true));
}

export function parseNavigationJson(text: string): NavItem[] {
	const parsed = JSON.parse(text) as unknown;
	if (!Array.isArray(parsed)) throw new Error('Menu musi być tablicą JSON');
	if (!parsed.every(isNavItem)) throw new Error('Nieprawidłowy element menu');
	return normalizeNavItems(parsed);
}

export function buildNavigationFilePayload(navigation: NavItem[]): string {
	const payload = navigation.map((item) => exportNavItem(item, true));
	return `${JSON.stringify(payload, null, '\t')}\n`;
}
