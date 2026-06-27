import type { NavItem } from '@/lib/astro-layout/types';

export type NavMenuColumns = 1 | 2;

export type NavDropdownLayout = {
	columns: NavMenuColumns;
	columnWidths: [string] | [string, string];
};

export const DEFAULT_NAV_MENU_COLUMN_WIDTH = '320px';
export const DEFAULT_NAV_MENU_COLUMN_WIDTHS_2: [string, string] = ['1fr', '1fr'];

const CSS_SIZE =
	/^(?:auto|\d+(?:\.\d+)?(?:px|rem|em|%|fr|ch|vw|vh)|minmax\([^)]+\)|fit-content\([^)]*\))$/;

export function sanitizeNavMenuColumnWidth(raw: string | undefined): string | undefined {
	if (!raw?.trim()) return undefined;
	const value = raw.trim();
	return CSS_SIZE.test(value) ? value : undefined;
}

export function readNavMenuColumns(raw: unknown): NavMenuColumns | undefined {
	if (raw === 1 || raw === '1') return 1;
	if (raw === 2 || raw === '2') return 2;
	return undefined;
}

/** Migruje isMegaMenu → menuColumns: 2 */
export function resolveNavMenuColumns(item: Pick<NavItem, 'menuColumns' | 'isMegaMenu'>): NavMenuColumns {
	if (item.menuColumns === 2 || item.isMegaMenu === true) return 2;
	if (item.menuColumns === 1) return 1;
	return 1;
}

export function resolveNavDropdownLayout(
	item: Pick<NavItem, 'menuColumns' | 'menuColumnWidths' | 'isMegaMenu'>,
): NavDropdownLayout {
	const columns = resolveNavMenuColumns(item);
	if (columns === 2) {
		const w0 =
			sanitizeNavMenuColumnWidth(item.menuColumnWidths?.[0]) ??
			DEFAULT_NAV_MENU_COLUMN_WIDTHS_2[0];
		const w1 =
			sanitizeNavMenuColumnWidth(item.menuColumnWidths?.[1]) ??
			DEFAULT_NAV_MENU_COLUMN_WIDTHS_2[1];
		return { columns: 2, columnWidths: [w0, w1] };
	}
	const w0 =
		sanitizeNavMenuColumnWidth(item.menuColumnWidths?.[0]) ?? DEFAULT_NAV_MENU_COLUMN_WIDTH;
	return { columns: 1, columnWidths: [w0] };
}

export function formatNavDropdownLayoutSummary(
	layout: NavDropdownLayout,
	labels: { oneColumn: string; twoColumns: string },
): string {
	if (layout.columns === 2) {
		return `${labels.twoColumns} (${layout.columnWidths.join(' · ')})`;
	}
	return `${labels.oneColumn} (${layout.columnWidths[0]})`;
}

export function normalizeNavDropdownFields(item: NavItem): void {
	const columns = resolveNavMenuColumns(item);
	item.menuColumns = columns;

	const layout = resolveNavDropdownLayout(item);
	item.menuColumnWidths = [...layout.columnWidths];

	delete item.isMegaMenu;
}

export function applyNavDropdownFieldsFromForm(
	item: NavItem,
	columnsRaw: string,
	width0Raw: string,
	width1Raw: string,
): void {
	const columns = readNavMenuColumns(columnsRaw) ?? 1;
	item.menuColumns = columns;

	const widths: string[] = [];
	const w0 = sanitizeNavMenuColumnWidth(width0Raw);
	if (w0) widths.push(w0);
	if (columns === 2) {
		const w1 = sanitizeNavMenuColumnWidth(width1Raw);
		if (w1) widths.push(w1);
	}
	if (widths.length > 0) item.menuColumnWidths = widths;

	delete item.isMegaMenu;
}
