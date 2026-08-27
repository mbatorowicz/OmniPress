/** Delegacja zdarzeń edytora nawigacji — jeden listener na formularz zamiast wiązania per wiersz. */
import { type NavTargetOptions } from '@/lib/admin/nav-target-options';
import type { NavigationTableLabels } from './nav-form-labels';
import { getEditorForSummary, readNavTargetOptions } from './nav-form-dom';
import { refreshAllParentSelects, syncSubmitFields } from './nav-form-fields';
import { syncDropdownLayoutCell } from './nav-form-dropdown';
import { openNavEditor, syncNavDepthVisual, syncNavRowSummary } from './nav-form-summary';
import {
	appendNavChildRow,
	appendNavEntry,
	removeNavEntry,
	reorderNavEntries,
} from './nav-form-rows';

export function handleNavigationChange(
	event: Event,
	body: HTMLElement,
	labels: NavigationTableLabels,
): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	if (target.closest('.nav-href-target-control')) {
		const row = target.closest('.nav-row-editor');
		if (row instanceof HTMLElement) syncSubmitFields(row);
		return;
	}

	if (target.closest('.nav-parent')) {
		const row = target.closest('.nav-row-editor');
		if (row instanceof HTMLElement) {
			syncSubmitFields(row);
			reorderNavEntries(body, labels);
		}
		return;
	}

	// Etykieta jest treścią opcji „pozycja nadrzędna” w pozostałych wierszach.
	if (target.closest('input[name="nav_label"]')) {
		refreshAllParentSelects(body, labels);
		return;
	}

	if (target.closest('.nav-depth')) {
		const row = target.closest('.nav-row-editor');
		if (row instanceof HTMLElement) {
			syncNavDepthVisual(row);
			syncDropdownLayoutCell(row);
			refreshAllParentSelects(body, labels);
			syncSubmitFields(row);
			reorderNavEntries(body, labels);
		}
		return;
	}

	if (target.closest('.nav-menu-columns, .nav-menu-col-width-0, .nav-menu-col-width-1')) {
		const row = target.closest('.nav-row-editor');
		const options = readNavTargetOptions();
		if (row instanceof HTMLElement) {
			syncDropdownLayoutCell(row);
			if (options) syncNavRowSummary(row, labels, options);
		}
	}
}

export function handleNavigationClick(
	event: Event,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const body = document.getElementById('navigation-body');
	if (!(body instanceof HTMLElement)) return;

	if (target.closest('#add-nav-row')) {
		event.preventDefault();
		appendNavEntry(body, labels, options, true);
		return;
	}

	const editBtn = target.closest('.edit-nav-row');
	if (editBtn) {
		event.preventDefault();
		const summary = editBtn.closest('.nav-row-summary');
		const editor = summary instanceof HTMLElement ? getEditorForSummary(summary) : null;
		if (editor) openNavEditor(editor, body, labels, options);
		return;
	}

	const closeBtn = target.closest('.close-nav-row');
	if (closeBtn) {
		event.preventDefault();
		const editor = closeBtn.closest('.nav-row-editor');
		if (editor instanceof HTMLElement) {
			syncNavRowSummary(editor, labels, options);
			editor.classList.add('hidden');
			reorderNavEntries(body, labels);
		}
		return;
	}

	const addChildBtn = target.closest('.add-nav-child');
	if (addChildBtn) {
		event.preventDefault();
		const parentSummary = addChildBtn.closest('.nav-row-summary');
		if (parentSummary instanceof HTMLElement) {
			appendNavChildRow(parentSummary, body, labels, options);
		}
		return;
	}

	const removeBtn = target.closest('.remove-nav-row');
	if (!removeBtn) return;
	const summary = removeBtn.closest('.nav-row-summary');
	if (!(summary instanceof HTMLElement)) return;
	removeNavEntry(summary, body, labels);
}
