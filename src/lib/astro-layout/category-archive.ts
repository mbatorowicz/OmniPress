import type {
	CategoryArchiveColumns,
	CategoryArchiveLayout,
	CategoryDefinition,
} from './types';

export function readCategoryArchiveLayout(raw: unknown): CategoryArchiveLayout | undefined {
	if (raw === 'tiles' || raw === 'title-list') return raw;
	return undefined;
}

export function readCategoryArchiveColumns(raw: unknown): CategoryArchiveColumns | undefined {
	if (raw === 1 || raw === '1') return 1;
	if (raw === 2 || raw === '2') return 2;
	if (raw === 3 || raw === '3') return 3;
	return undefined;
}

export function normalizeCategoryDefinition(raw: unknown): CategoryDefinition | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as CategoryDefinition;
	const slug = String(o.slug ?? '').trim();
	const name = String(o.name ?? '').trim();
	if (!slug || !name) return null;

	const item: CategoryDefinition = { slug, name };
	const layout = readCategoryArchiveLayout(o.archiveLayout);
	if (layout === 'title-list') item.archiveLayout = 'title-list';
	else if (layout === 'tiles') item.archiveLayout = 'tiles';

	const columns = readCategoryArchiveColumns(o.archiveColumns);
	if (columns !== undefined && item.archiveLayout !== 'title-list') {
		item.archiveColumns = columns;
	}

	return item;
}

export function applyCategoryArchiveFieldsFromForm(
	item: CategoryDefinition,
	layoutRaw: string,
	columnsRaw: string,
): void {
	const layout = readCategoryArchiveLayout(layoutRaw.trim()) ?? 'tiles';
	if (layout === 'title-list') {
		item.archiveLayout = 'title-list';
		delete item.archiveColumns;
		return;
	}

	item.archiveLayout = 'tiles';
	const columns = readCategoryArchiveColumns(columnsRaw.trim()) ?? 2;
	item.archiveColumns = columns;
}

export function resolveCategoryArchiveSettings(
	category: Pick<CategoryDefinition, 'archiveLayout' | 'archiveColumns'>,
): { layout: CategoryArchiveLayout; columns: CategoryArchiveColumns } {
	const layout = readCategoryArchiveLayout(category.archiveLayout) ?? 'tiles';
	if (layout === 'title-list') {
		return { layout: 'title-list', columns: 1 };
	}
	return {
		layout: 'tiles',
		columns: readCategoryArchiveColumns(category.archiveColumns) ?? 2,
	};
}
