/** Cykl życia wiersza nawigacji: inicjalizacja, dodanie pozycji i podpozycji, usunięcie, kolejność. */
import { computeNavRowOrder } from '@/lib/admin/navigation-tree';
import { type NavTargetOptions } from '@/lib/admin/nav-target-options';
import type { NavigationTableLabels } from './nav-form-labels';
import {
	collectRowMeta,
	getEditorForSummary,
	getEditorRows,
	getNavEntries,
	getSummaryForEditor,
	readRowDepth,
	readRowKind,
} from './nav-form-dom';
import {
	bindKindSelect,
	rebuildNavTarget,
	refreshAllParentSelects,
	syncNavChildButton,
	syncParentSelect,
	syncSubmitFields,
} from './nav-form-fields';
import { bindDropdownLayoutInputs, syncDropdownLayoutCell } from './nav-form-dropdown';
import { createNavEntryElement } from './nav-form-markup';
import { openNavEditor, syncNavDepthVisual } from './nav-form-summary';

export function reorderNavEntries(body: HTMLElement, labels: NavigationTableLabels): void {
	const meta = collectRowMeta(body);
	const order = computeNavRowOrder(meta);
	const entries = getNavEntries(body);

	if (order.length !== entries.length) return;
	if (order.every((value, index) => value === index)) return;

	for (const index of order) {
		body.appendChild(entries[index]!);
	}

	refreshAllParentSelects(body, labels);
}

export function initNavigationRow(
	editorRow: HTMLElement,
	options: NavTargetOptions,
	body: HTMLElement,
	labels: NavigationTableLabels,
): void {
	const kindSelect = editorRow.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	const kindHidden = editorRow.querySelector('.nav-href-kind-submit') as HTMLInputElement | null;
	const hidden = editorRow.querySelector('.nav-href-value-submit') as HTMLInputElement | null;
	const initialKind = editorRow.dataset.navKind || kindSelect?.dataset.initialKind || 'none';
	const initialHref = editorRow.dataset.navHref || hidden?.value || '';

	if (kindSelect && initialKind !== 'none') kindSelect.value = initialKind;
	if (kindHidden && initialKind !== 'none') kindHidden.value = initialKind;
	if (hidden && initialHref && !hidden.value.trim()) hidden.value = initialHref;

	const columnsSelect = editorRow.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const initialColumns = columnsSelect?.dataset.initialColumns;
	if (columnsSelect && (initialColumns === '1' || initialColumns === '2')) {
		columnsSelect.value = initialColumns;
	}

	rebuildNavTarget(editorRow, readRowKind(editorRow), options);
	bindKindSelect(editorRow);
	syncParentSelect(editorRow, body, labels);
	syncSubmitFields(editorRow);
	syncNavDepthVisual(editorRow);
	syncDropdownLayoutCell(editorRow);
	bindDropdownLayoutInputs(editorRow);
	const summary = getSummaryForEditor(editorRow);
	if (summary) syncNavChildButton(summary, readRowDepth(editorRow));
}

export function appendNavEntry(
	body: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
	openEditor = true,
): HTMLElement {
	const entry = createNavEntryElement(labels, openEditor);
	body.appendChild(entry);
	const editor = entry.querySelector('.nav-row-editor');
	if (!(editor instanceof HTMLElement)) return entry;
	initNavigationRow(editor, options, body, labels);
	if (openEditor) openNavEditor(editor, body, labels, options);
	return entry;
}

/** Podpozycja ląduje przed pierwszym kolejnym wierszem o głębokości ≤ rodzica. */
function findInsertBefore(body: HTMLElement, parentEditorRow: HTMLElement): HTMLElement | null {
	const editorRows = getEditorRows(body);
	const parentIndex = editorRows.indexOf(parentEditorRow);
	if (parentIndex < 0) return null;
	const parentDepth = readRowDepth(parentEditorRow);
	for (let i = parentIndex + 1; i < editorRows.length; i++) {
		if (readRowDepth(editorRows[i]!) <= parentDepth) {
			return editorRows[i]!.closest('.nav-entry');
		}
	}
	return null;
}

export function appendNavChildRow(
	parentSummaryRow: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	const parentEditor = getEditorForSummary(parentSummaryRow);
	if (!parentEditor) return;
	const parentDepth = readRowDepth(parentEditor);
	if (parentDepth >= 2) return;

	const parentIndex = getEditorRows(body).indexOf(parentEditor);
	const entry = createNavEntryElement(labels, true);
	const editor = entry.querySelector('.nav-row-editor');
	if (!(editor instanceof HTMLElement)) return;

	const depthSelect = editor.querySelector('.nav-depth') as HTMLSelectElement | null;
	if (depthSelect) depthSelect.value = String(parentDepth + 1);
	editor.dataset.navParent = String(parentIndex);
	entry.classList.remove('nav-row--depth-0');
	entry.classList.add(`nav-row--depth-${parentDepth + 1}`);

	const insertBefore = findInsertBefore(body, parentEditor);
	if (insertBefore) body.insertBefore(entry, insertBefore);
	else body.appendChild(entry);

	initNavigationRow(editor, options, body, labels);
	openNavEditor(editor, body, labels, options);
	refreshAllParentSelects(body, labels);
	reorderNavEntries(body, labels);
}

/** Ostatnia pozycja zostaje — formularz bez żadnego wiersza nie da się zapisać. */
export function removeNavEntry(
	summaryRow: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
): void {
	if (getEditorRows(body).length <= 1) return;
	const entry = summaryRow.closest('.nav-entry');
	entry?.remove();
	refreshAllParentSelects(body, labels);
	reorderNavEntries(body, labels);
}
