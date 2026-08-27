/** Drzewo nawigacji z formularza — płaskie wiersze (poziom + rodzic) składane w hierarchię. */
import { parseNavigationJson } from './parse';
import { applyNavDropdownFieldsFromForm } from '@/lib/admin/nav-dropdown-layout';
import { isExternalHref, normalizeInternalHref, countNavigationHrefs } from './validate-nav';
import { strFields } from './parse-form-fields';
import type { NavItem } from './types';

function resolveNavHref(kind: string, value: string): string | undefined {
	const trimmed = value.trim();
	if (kind === 'none' || !kind) return undefined;
	if (kind === 'external') return trimmed || undefined;
	if (kind === 'category') {
		if (!trimmed) return undefined;
		return normalizeInternalHref(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
	}
	if (kind === 'page' || kind === 'static' || kind === 'custom') {
		if (!trimmed) return undefined;
		if (isExternalHref(trimmed)) return trimmed;
		return normalizeInternalHref(trimmed);
	}
	return undefined;
}

/**
 * Przeglądarki wysyłają czasem więcej wartości `nav_href_value` niż wierszy
 * (ukryte pole + kontrolka) — wtedy szukamy wartości w kolejnych „pasach” tablicy.
 */
function resolveRowHrefValue(values: string[], rowIndex: number, rowCount: number): string {
	const direct = values[rowIndex]?.trim() ?? '';
	if (direct) return direct;
	if (values.length > rowCount) {
		const stride = Math.max(1, Math.floor(values.length / rowCount));
		for (let offset = 1; offset < stride; offset++) {
			const candidate = values[rowIndex + offset * rowCount]?.trim() ?? '';
			if (candidate) return candidate;
		}
	}
	return '';
}

export function parseNavigationFromForm(form: FormData): NavItem[] {
	const depths = strFields(form, 'nav_depth');
	const labels = strFields(form, 'nav_label');
	const kinds = strFields(form, 'nav_href_kind');
	const values = strFields(form, 'nav_href_value');
	const parents = strFields(form, 'nav_parent');
	const menuColumns = strFields(form, 'nav_menu_columns');
	const menuColWidth0 = strFields(form, 'nav_menu_col_width_0');
	const menuColWidth1 = strFields(form, 'nav_menu_col_width_1');

	if (labels.length === 0) return [];

	const rowCount = labels.length;
	const items: (NavItem | null)[] = new Array(rowCount).fill(null);
	const roots: NavItem[] = [];

	for (let i = 0; i < rowCount; i++) {
		const label = labels[i]?.trim();
		if (!label) continue;

		const depth = Math.min(2, Math.max(0, Number(depths[i] ?? 0) || 0));
		const item: NavItem = { label };
		const href = resolveNavHref(kinds[i] ?? 'none', resolveRowHrefValue(values, i, rowCount));
		if (href) item.href = href;
		if (depth === 0) {
			applyNavDropdownFieldsFromForm(
				item,
				menuColumns[i] ?? '1',
				menuColWidth0[i] ?? '',
				menuColWidth1[i] ?? '',
			);
			if (item.menuColumns === 1 && !item.menuColumnWidths?.length) {
				delete item.menuColumns;
			}
		}
		items[i] = item;
	}

	for (let i = 0; i < rowCount; i++) {
		const item = items[i];
		if (!item) continue;

		const depth = Math.min(2, Math.max(0, Number(depths[i] ?? 0) || 0));
		const parentRaw = parents[i]?.trim() ?? '';

		if (depth === 0) {
			roots.push(item);
			continue;
		}

		// Rodzic musi być wcześniejszym wierszem o poziom wyżej — inaczej formularz jest niespójny.
		if (!parentRaw) return [];
		const parentIndex = Number(parentRaw);
		if (!Number.isInteger(parentIndex) || parentIndex < 0 || parentIndex >= i) return [];

		const parentItem = items[parentIndex];
		if (!parentItem) return [];

		const parentDepth = Math.min(2, Math.max(0, Number(depths[parentIndex] ?? 0) || 0));
		if (parentDepth !== depth - 1) return [];

		if (!parentItem.children) parentItem.children = [];
		parentItem.children.push(item);
	}

	return roots;
}

/** Tabela wierszy jest źródłem prawdy; surowy JSON ratuje sytuację, gdy tabela zgubiła wszystkie linki. */
export function parseNavigationSection(
	form: FormData,
): NavItem[] | { error: 'invalid_navigation' } {
	const labels = strFields(form, 'nav_label');
	const hasTableRows = labels.some((label) => label.trim() !== '');
	const jsonFallback = String(form.get('navigation_json') ?? '').trim();

	if (hasTableRows) {
		const tableTree = parseNavigationFromForm(form);
		if (tableTree.length === 0) return { error: 'invalid_navigation' };

		if (jsonFallback) {
			try {
				const jsonTree = parseNavigationJson(jsonFallback);
				const tableHrefs = countNavigationHrefs(tableTree);
				const jsonHrefs = countNavigationHrefs(jsonTree);
				if (tableHrefs === 0 && jsonHrefs > 0) {
					return jsonTree;
				}
			} catch {
				// zostaw drzewo z tabeli
			}
		}

		return tableTree;
	}

	if (jsonFallback) {
		try {
			return parseNavigationJson(jsonFallback);
		} catch {
			return { error: 'invalid_navigation' };
		}
	}

	return { error: 'invalid_navigation' };
}
