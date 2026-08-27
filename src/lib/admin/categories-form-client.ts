export type CategoriesFormLabels = {
	remove: string;
	edit: string;
	closeEdit: string;
	fieldSlug: string;
	fieldName: string;
	fieldArchiveLayout: string;
	fieldArchiveColumns: string;
	layoutTiles: string;
	layoutTitleList: string;
	columnsOne: string;
	columnsTwo: string;
	columnsThree: string;
	summaryTilesPrefix: string;
	summaryTitleList: string;
};

let nextCategoryEntryId = 0;

function getEditorRows(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll<HTMLElement>('.category-row-editor')];
}

function getSummaryForEditor(editorRow: HTMLElement): HTMLElement | null {
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

function getEditorForSummary(summaryRow: HTMLElement): HTMLElement | null {
	const entryId = summaryRow.dataset.categoryEntry;
	if (!entryId) return null;
	const editor = summaryRow
		.closest('#categories-body')
		?.querySelector(`.category-row-editor[data-category-entry="${entryId}"]`);
	return editor instanceof HTMLElement ? editor : null;
}

function formatArchiveSummary(
	layout: string,
	columns: string,
	labels: CategoriesFormLabels,
): string {
	if (layout === 'title-list') return labels.summaryTitleList;
	const colLabel =
		columns === '1' ? labels.columnsOne : columns === '3' ? labels.columnsThree : labels.columnsTwo;
	return `${labels.summaryTilesPrefix} · ${colLabel}`;
}

function syncArchiveColumnsField(editorRow: HTMLElement): void {
	const layoutSelect = editorRow.querySelector('.category-archive-layout') as HTMLSelectElement | null;
	const columnsSelect = editorRow.querySelector('.category-archive-columns') as HTMLSelectElement | null;
	if (!layoutSelect || !columnsSelect) return;
	const isTitleList = layoutSelect.value === 'title-list';
	columnsSelect.disabled = isTitleList;
}

function initCategoryArchiveFields(editorRow: HTMLElement): void {
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

function bindCategoryArchiveFields(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
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

function syncCategorySummary(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
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

function closeAllCategoryEditors(body: HTMLElement, labels: CategoriesFormLabels): void {
	getEditorRows(body).forEach((row) => {
		if (!row.classList.contains('hidden')) syncCategorySummary(row, labels);
		row.classList.add('hidden');
	});
}

function openCategoryEditor(editorRow: HTMLElement, body: HTMLElement, labels: CategoriesFormLabels): void {
	closeAllCategoryEditors(body, labels);
	editorRow.classList.remove('hidden');
	editorRow.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
	const slugInput = editorRow.querySelector('input[name="category_slug"]');
	if (slugInput instanceof HTMLInputElement) slugInput.focus();
}

function buildCategoryEditorHtml(labels: CategoriesFormLabels): string {
	return `
		<div class="category-row-editor-panel">
			<div class="category-row-editor-grid">
				<label class="category-row-editor-field">
					<span class="category-row-editor-label">${labels.fieldSlug}</span>
					<input name="category_slug" required class="ui-input-compact ui-input-compact--mono w-full" />
				</label>
				<label class="category-row-editor-field">
					<span class="category-row-editor-label">${labels.fieldName}</span>
					<input name="category_name" required class="ui-input-compact w-full" />
				</label>
				<label class="category-row-editor-field">
					<span class="category-row-editor-label">${labels.fieldArchiveLayout}</span>
					<select name="category_archive_layout" class="category-archive-layout ui-select-compact w-full" data-initial-layout="tiles">
						<option value="tiles">${labels.layoutTiles}</option>
						<option value="title-list">${labels.layoutTitleList}</option>
					</select>
				</label>
				<label class="category-row-editor-field">
					<span class="category-row-editor-label">${labels.fieldArchiveColumns}</span>
					<select name="category_archive_columns" class="category-archive-columns ui-select-compact w-full" data-initial-columns="2">
						<option value="1">${labels.columnsOne}</option>
						<option value="2" selected>${labels.columnsTwo}</option>
						<option value="3">${labels.columnsThree}</option>
					</select>
				</label>
			</div>
			<div class="category-row-editor-footer">
				<button type="button" class="close-category ui-btn ui-btn--ghost text-xs">${labels.closeEdit}</button>
			</div>
		</div>
	`;
}

function createCategoryEntryElements(
	labels: CategoriesFormLabels,
	openEditor: boolean,
): [HTMLTableRowElement, HTMLTableRowElement] {
	const entryId = String(nextCategoryEntryId++);

	const summaryTr = document.createElement('tr');
	summaryTr.className = 'category-row-summary ui-table-dense-row';
	summaryTr.dataset.categoryEntry = entryId;
	summaryTr.innerHTML = `
		<td class="ui-table-dense-td--wide">
			<div class="flex min-w-0 flex-col gap-0.5">
				<span class="category-summary-name">—</span>
				<span class="category-summary-slug ui-caption ui-input-compact--mono">—</span>
				<span class="category-summary-layout ui-caption">${labels.summaryTilesPrefix} · ${labels.columnsTwo}</span>
			</div>
		</td>
		<td class="ui-table-dense-td--wide category-row-actions">
			<div class="flex flex-col items-start gap-1">
				<button type="button" class="edit-category ui-btn ui-btn--link text-xs">${labels.edit}</button>
				<button type="button" class="remove-category ui-btn ui-btn--link-danger text-xs">${labels.remove}</button>
			</div>
		</td>
	`;

	const editorTr = document.createElement('tr');
	editorTr.className = `category-row-editor ui-table-dense-row${openEditor ? '' : ' hidden'}`;
	editorTr.dataset.categoryEntry = entryId;
	editorTr.innerHTML = `<td colspan="2" class="ui-table-dense-td--wide">${buildCategoryEditorHtml(labels)}</td>`;

	return [summaryTr, editorTr];
}

function initCategoryRow(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
	initCategoryArchiveFields(editorRow);
	bindCategoryArchiveFields(editorRow, labels);
	syncCategorySummary(editorRow, labels);
}

function appendCategoryEntry(body: HTMLElement, labels: CategoriesFormLabels, openEditor = true): void {
	const [summaryTr, editorTr] = createCategoryEntryElements(labels, openEditor);
	body.appendChild(summaryTr);
	body.appendChild(editorTr);
	initCategoryRow(editorTr, labels);
	if (openEditor) openCategoryEditor(editorTr, body, labels);
}

function removeCategoryEntry(summaryRow: HTMLElement, body: HTMLElement): void {
	const editor = getEditorForSummary(summaryRow);
	if (getEditorRows(body).length <= 1) return;
	summaryRow.remove();
	editor?.remove();
}

function handleCategoriesClick(event: Event, labels: CategoriesFormLabels): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const form = target.closest('[data-categories-form]');
	if (!(form instanceof HTMLFormElement)) return;
	const body = form.querySelector('#categories-body');
	if (!(body instanceof HTMLElement)) return;

	if (target.closest('#add-category')) {
		event.preventDefault();
		appendCategoryEntry(body, labels, true);
		return;
	}

	const editBtn = target.closest('.edit-category');
	if (editBtn) {
		event.preventDefault();
		const summary = editBtn.closest('.category-row-summary');
		const editor = summary instanceof HTMLElement ? getEditorForSummary(summary) : null;
		if (editor) openCategoryEditor(editor, body, labels);
		return;
	}

	const closeBtn = target.closest('.close-category');
	if (closeBtn) {
		event.preventDefault();
		const editor = closeBtn.closest('.category-row-editor');
		if (editor instanceof HTMLElement) {
			syncCategorySummary(editor, labels);
			editor.classList.add('hidden');
		}
		return;
	}

	const removeBtn = target.closest('.remove-category');
	if (!removeBtn) return;
	const summary = removeBtn.closest('.category-row-summary');
	if (!(summary instanceof HTMLElement)) return;
	removeCategoryEntry(summary, body);
}

export function mountCategoriesForm(labels: CategoriesFormLabels): void {
	const bind = (): void => {
		const form = document.querySelector('[data-categories-form]');
		const body = document.getElementById('categories-body');
		if (!(body instanceof HTMLElement)) return;

		nextCategoryEntryId = getEditorRows(body).length;

		getEditorRows(body).forEach((row) => {
			initCategoryRow(row, labels);
		});

		const interactionRoot = form instanceof HTMLFormElement ? form : document;
		if (
			interactionRoot instanceof HTMLElement &&
			interactionRoot.dataset.categoriesFormBound !== '1'
		) {
			interactionRoot.dataset.categoriesFormBound = '1';
			interactionRoot.addEventListener('click', (event) => {
				handleCategoriesClick(event, labels);
			});
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bind, { once: true });
	} else {
		bind();
	}
	document.addEventListener('astro:page-load', bind);
}

/** @deprecated Użyj mountCategoriesForm */
export function initCategoriesTable(removeCategoryLabel: string): void {
	mountCategoriesForm({
		remove: removeCategoryLabel,
		edit: 'Edytuj',
		closeEdit: 'Zamknij',
		fieldSlug: 'Slug',
		fieldName: 'Nazwa',
		fieldArchiveLayout: 'Wyświetlanie',
		fieldArchiveColumns: 'Kolumny',
		layoutTiles: 'Kafelki',
		layoutTitleList: 'Lista tytułów',
		columnsOne: '1 kolumna',
		columnsTwo: '2 kolumny',
		columnsThree: '3 kolumny',
		summaryTilesPrefix: 'Kafelki',
		summaryTitleList: 'Lista tytułów',
	});
}
