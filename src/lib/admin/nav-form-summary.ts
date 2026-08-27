/** Kafelek podsumowania pozycji nawigacji — to, co widać po zamknięciu panelu edycji. */
import { formatNavDropdownLayoutSummary } from '@/lib/admin/nav-dropdown-layout';
import { type NavTargetOptions, formatNavTargetSummary } from '@/lib/admin/nav-target-options';
import type { NavigationTableLabels } from './nav-form-labels';
import {
	DEPTH_CLASSES,
	getEditorRows,
	getNavEntry,
	getSummaryForEditor,
	readRowDepth,
	readRowKind,
} from './nav-form-dom';
import { syncNavChildButton } from './nav-form-fields';
import { readDropdownLayoutFromRow, syncDropdownLayoutCell } from './nav-form-dropdown';

export function syncNavDepthVisual(editorRow: HTMLElement): void {
	const entry = getNavEntry(editorRow);
	if (!entry) return;
	const depth = readRowDepth(editorRow);
	for (const cls of DEPTH_CLASSES) entry.classList.remove(cls);
	entry.classList.add(DEPTH_CLASSES[depth]!);
}

export function syncNavRowSummary(
	editorRow: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	const summary = getSummaryForEditor(editorRow);
	if (!summary) return;

	const depth = readRowDepth(editorRow);
	const label =
		(editorRow.querySelector('input[name="nav_label"]') as HTMLInputElement | null)?.value.trim() ||
		'—';
	const kind = readRowKind(editorRow);
	const hrefValue =
		(editorRow.querySelector('.nav-href-value-submit') as HTMLInputElement | null)?.value ?? '';

	const labelEl = summary.querySelector('.nav-summary-label');
	if (labelEl) labelEl.textContent = label;

	const linkText = summary.querySelector('.nav-summary-link-text');
	if (linkText) {
		linkText.textContent = formatNavTargetSummary(kind, hrefValue, options, labels.hrefKinds);
	}

	// Układ dropdownu dotyczy tylko poziomu głównego — na podpozycjach znacznik znika.
	let layoutEl = summary.querySelector('.nav-summary-layout');
	const tileMain = summary.querySelector('.nav-tile-main');
	if (depth === 0) {
		const layoutSummary = formatNavDropdownLayoutSummary(readDropdownLayoutFromRow(editorRow), {
			oneColumn: labels.menuColumnOne,
			twoColumns: labels.menuColumnTwo,
		});
		if (!layoutEl && tileMain) {
			layoutEl = document.createElement('span');
			layoutEl.className = 'nav-summary-layout';
			tileMain.appendChild(layoutEl);
		}
		if (layoutEl) layoutEl.textContent = layoutSummary;
	} else if (layoutEl instanceof HTMLElement) {
		layoutEl.remove();
	}

	syncNavDepthVisual(editorRow);
	syncDropdownLayoutCell(editorRow);
	syncNavChildButton(summary, depth);
}

export function closeAllEditors(
	body: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	getEditorRows(body).forEach((row) => {
		if (!row.classList.contains('hidden')) {
			syncNavRowSummary(row, labels, options);
		}
		row.classList.add('hidden');
	});
}

/** Jednocześnie otwarty jest najwyżej jeden panel edycji. */
export function openNavEditor(
	editorRow: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	closeAllEditors(body, labels, options);
	editorRow.classList.remove('hidden');
	editorRow.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}
