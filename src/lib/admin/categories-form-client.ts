export type CategoriesFormLabels = {
	remove: string;
	edit: string;
	closeEdit: string;
	fieldSlug: string;
	fieldName: string;
};

let nextCategoryEntryId = 0;

function getEditorRows(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll('.category-row-editor')];
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

function syncCategorySummary(editorRow: HTMLElement): void {
	const summary = getSummaryForEditor(editorRow);
	if (!summary) return;

	const slug =
		(editorRow.querySelector('input[name="category_slug"]') as HTMLInputElement | null)?.value.trim() ||
		'—';
	const name =
		(editorRow.querySelector('input[name="category_name"]') as HTMLInputElement | null)?.value.trim() ||
		'—';

	const nameEl = summary.querySelector('.category-summary-name');
	if (nameEl) nameEl.textContent = name;

	const slugEl = summary.querySelector('.category-summary-slug');
	if (slugEl) slugEl.textContent = slug;
}

function closeAllCategoryEditors(body: HTMLElement): void {
	getEditorRows(body).forEach((row) => {
		if (!row.classList.contains('hidden')) syncCategorySummary(row);
		row.classList.add('hidden');
	});
}

function openCategoryEditor(editorRow: HTMLElement, body: HTMLElement): void {
	closeAllCategoryEditors(body);
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

function appendCategoryEntry(body: HTMLElement, labels: CategoriesFormLabels, openEditor = true): void {
	const [summaryTr, editorTr] = createCategoryEntryElements(labels, openEditor);
	body.appendChild(summaryTr);
	body.appendChild(editorTr);
	if (openEditor) openCategoryEditor(editorTr, body);
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
		if (editor) openCategoryEditor(editor, body);
		return;
	}

	const closeBtn = target.closest('.close-category');
	if (closeBtn) {
		event.preventDefault();
		const editor = closeBtn.closest('.category-row-editor');
		if (editor instanceof HTMLElement) {
			syncCategorySummary(editor);
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
			syncCategorySummary(row);
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
	});
}
