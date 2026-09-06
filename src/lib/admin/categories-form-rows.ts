import type { CategoriesFormLabels } from './categories-form-client';
import {
	bindCategoryArchiveFields,
	bindCategorySlugFromName,
	getEditorForSummary,
	getEditorRows,
	initCategoryArchiveFields,
	openCategoryEditor,
	syncCategorySummary,
} from './categories-form-dom';

let nextCategoryEntryId = 0;

export function resetCategoryEntryIds(startAt: number): void {
	nextCategoryEntryId = startAt;
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

export function initCategoryRow(editorRow: HTMLElement, labels: CategoriesFormLabels): void {
	initCategoryArchiveFields(editorRow);
	bindCategoryArchiveFields(editorRow, labels);
	bindCategorySlugFromName(editorRow, labels);
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

export function handleCategoriesClick(event: Event, labels: CategoriesFormLabels): void {
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
