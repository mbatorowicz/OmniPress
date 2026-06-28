import type { NavItem } from '@/lib/astro-layout/types';

export type NavMenuColumns = 1 | 2;

export type NavDropdownLayout = {
	columns: NavMenuColumns;
	columnWidths: string[];
};

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
	const columnWidths = (item.menuColumnWidths ?? [])
		.map(sanitizeNavMenuColumnWidth)
		.filter((width): width is string => Boolean(width))
		.slice(0, columns === 2 ? 2 : 1);
	return { columns, columnWidths };
}

export function formatNavDropdownLayoutSummary(
	layout: NavDropdownLayout,
	labels: { oneColumn: string; twoColumns: string },
): string {
	if (layout.columns === 2) {
		return layout.columnWidths.length > 0
			? `${labels.twoColumns} (${layout.columnWidths.join(' · ')})`
			: labels.twoColumns;
	}
	return layout.columnWidths.length > 0
		? `${labels.oneColumn} (${layout.columnWidths[0]})`
		: labels.oneColumn;
}

export function normalizeNavDropdownFields(item: NavItem): void {
	item.menuColumns = resolveNavMenuColumns(item);
	const columnWidths = (item.menuColumnWidths ?? [])
		.map(sanitizeNavMenuColumnWidth)
		.filter((width): width is string => Boolean(width))
		.slice(0, item.menuColumns === 2 ? 2 : 1);
	if (columnWidths.length > 0) item.menuColumnWidths = columnWidths;
	else delete item.menuColumnWidths;
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
	else delete item.menuColumnWidths;

	delete item.isMegaMenu;
}
