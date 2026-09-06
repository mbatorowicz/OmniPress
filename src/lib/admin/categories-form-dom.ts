import { normalizeSlug } from '@/lib/admin/slug';
import type { CategoriesFormLabels } from './categories-form-client';

export function getEditorRows(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll<HTMLElement>('.category-row-editor')];
}

export function getSummaryForEditor(editorRow: HTMLElement): HTMLElement | null {
	const entryId = editorRow.dataset.categoryEntry;
	if (entryId) {
		const summary = editorRow
			.closest('#categories-body')
			?.querySelector(`.category-row-summary[data-category-entry="${entryId}"]`);
		if (summary instanceof HTMLElement) return summary;
	}
	const prev = editorRow.previousElementSibling;
	return prev instanceof HTMLElement && prev.classList.contains('category-row-summary') ? prev : null;
}

export function getEditorForSummary(summaryRow: HTMLElement): HTMLElement | null {
	const entryId = summaryRow.dataset.categoryEntry;
	if (!entryId) return null;
	const editor = summaryRow
		.closest('#categories-body')
		?.querySelector(`.category-row-editor[data-category-entry="${entryId}"]`);
	return editor instanceof HTMLElement ? editor : null;
}

export function formatArchiveSummary(
	layout: string,
	columns: string,
	labels: CategoriesFormLabels,
): string {
	if (layout === 'title-list') return labels.summaryTitleList;
	const colLabel =
		columns === '1' ? labels.columnsOne : columns === '3' ? labels.columnsThree : labels.columnsTwo;
	return `${labels.summaryTilesPrefix} · ${colLabel}`;
}

export function syncArchiveColumnsField(editorRow: HTMLElement): void {
	const layoutSelect = editorRow.querySelector('.category-archive-layout') as HTMLSelectElement | null;
	const columnsSelect = editorRow.querySelector('.category-archive-columns') as HTMLSelectElement | null;
	if (!layoutSelect || !columnsSelect) return;
	const isTitleList = layoutSelect.value === 'title-list';
	// Nie używamy `disabled` — pole nie wchodzi wtedy do FormData i przesuwa
	// kolejne `category_archive_columns` (Ochrona ludności traciła 1 kolumnę).
	columnsSelect.ariaDisabled = isTitleList ? 'true' : 'false';
	columnsSelect.classList.toggle('is-inert', isTitleList);
	columnsSelect.tabIndex = isTitleList ? -1 : 0;
}

export function initCategoryArchiveFields(editorRow: HTMLElement): void {
	const layoutSelect = editorRow.querySelector('.category-archive-layout') as HTMLSelectElement | null;
	const columnsSelect = editorRow.querySelector('.category-archive-columns') as HTMLSelectElement | null;
	const initialLayout = layoutSelect?.dataset.initialLayout;
	if (layoutSelect && (initialLayout === 'tiles' || initialLayout === 'title-list')) {
		layoutSelect.value = initialLayout;
	}
	const initialColumns = columnsSelect?.dataset.initialColumns;
	if (columnsSelect && (initialColumns === '1' || initialColumns === '2' || initialColumns === '3')) {
		columnsSelect.value = initialColumns;
	}
	syncArchiveColumnsField(editorRow);
}

export function bindCategoryArchiveFields(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
	const layoutSelect = editorRow.querySelector('.category-archive-layout');
	if (!(layoutSelect instanceof HTMLSelectElement)) return;
	if (layoutSelect.dataset.archiveLayoutBound === '1') return;
	layoutSelect.dataset.archiveLayoutBound = '1';
	layoutSelect.addEventListener('change', () => {
		syncArchiveColumnsField(editorRow);
		syncCategorySummary(editorRow, labels);
	});
	const columnsSelect = editorRow.querySelector('.category-archive-columns');
	if (columnsSelect instanceof HTMLSelectElement) {
		columnsSelect.addEventListener('change', () => {
			syncCategorySummary(editorRow, labels);
		});
	}
}

export function bindCategorySlugFromName(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
	const slugInput = editorRow.querySelector('input[name="category_slug"]');
	const nameInput = editorRow.querySelector('input[name="category_name"]');
	if (!(slugInput instanceof HTMLInputElement) || !(nameInput instanceof HTMLInputElement)) return;
	if (slugInput.dataset.slugFromNameBound === '1') return;
	slugInput.dataset.slugFromNameBound = '1';
	if (!slugInput.value.trim()) slugInput.dataset.slugManual = '0';

	nameInput.addEventListener('input', () => {
		if (slugInput.dataset.slugManual === '1') return;
		slugInput.value = normalizeSlug(nameInput.value);
		syncCategorySummary(editorRow, labels);
	});
	slugInput.addEventListener('input', () => {
		slugInput.dataset.slugManual = '1';
		syncCategorySummary(editorRow, labels);
	});
}

export function syncCategorySummary(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
	const summary = getSummaryForEditor(editorRow);
	if (!summary) return;

	const slug =
		(editorRow.querySelector('input[name="category_slug"]') as HTMLInputElement | null)?.value.trim() ||
		'—';
	const name =
		(editorRow.querySelector('input[name="category_name"]') as HTMLInputElement | null)?.value.trim() ||
		'—';
	const layout =
		(editorRow.querySelector('.category-archive-layout') as HTMLSelectElement | null)?.value ?? 'tiles';
	const columns =
		(editorRow.querySelector('.category-archive-columns') as HTMLSelectElement | null)?.value ?? '2';

	const nameEl = summary.querySelector('.category-summary-name');
	if (nameEl) nameEl.textContent = name;

	const slugEl = summary.querySelector('.category-summary-slug');
	if (slugEl) slugEl.textContent = slug;

	const layoutEl = summary.querySelector('.category-summary-layout');
	if (layoutEl) layoutEl.textContent = formatArchiveSummary(layout, columns, labels);
}

export function closeAllCategoryEditors(body: HTMLElement, labels: CategoriesFormLabels): void {
	getEditorRows(body).forEach((row) => {
		if (!row.classList.contains('hidden')) syncCategorySummary(row, labels);
		row.classList.add('hidden');
	});
}

export function openCategoryEditor(editorRow: HTMLElement, body: HTMLElement, labels: CategoriesFormLabels): void {
	closeAllCategoryEditors(body, labels);
	editorRow.classList.remove('hidden');
	editorRow.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
	const slugInput = editorRow.querySelector('input[name="category_slug"]');
	const nameInput = editorRow.querySelector('input[name="category_name"]');
	if (
		slugInput instanceof HTMLInputElement &&
		!slugInput.value.trim() &&
		nameInput instanceof HTMLInputElement
	) {
		nameInput.focus();
		return;
	}
	if (slugInput instanceof HTMLInputElement) slugInput.focus();
}
