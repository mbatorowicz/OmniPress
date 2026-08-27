/** Kontrolki wiersza nawigacji: cel linku, pozycja nadrzędna i pola ukryte do submitu. */
import { eligibleNavParentIndices, formatNavParentOptionLabel } from '@/lib/admin/navigation-tree';
import {
	type NavTargetOptions,
	optionsForNavTargetKind,
	pickNavTargetValue,
} from '@/lib/admin/nav-target-options';
import type { NavigationTableLabels } from './nav-form-labels';
import {
	collectRowMeta,
	getEditorRows,
	getSummaryForEditor,
	readNavTargetOptions,
	readParentValue,
	readRowDepth,
	readRowKind,
	readTargetControlValue,
} from './nav-form-dom';

export function syncSubmitFields(row: HTMLElement): void {
	const kind = readRowKind(row);
	const kindHidden = row.querySelector('.nav-href-kind-submit') as HTMLInputElement | null;
	const valueHidden = row.querySelector('.nav-href-value-submit') as HTMLInputElement | null;
	if (kindHidden) kindHidden.value = kind;
	if (!valueHidden) return;
	valueHidden.value = kind === 'none' ? '' : readTargetControlValue(row);
	row.dataset.navKind = kind;
	row.dataset.navHref = valueHidden.value;
	const parent = readParentValue(row);
	row.dataset.navParent = parent === null ? '' : String(parent);
}

/** Kontrolka celu zależy od typu linku: tekst dla URL, select dla kategorii/stron/tras. */
export function rebuildNavTarget(row: HTMLElement, kind: string, options: NavTargetOptions): void {
	const host = row.querySelector('.nav-href-target-host');
	const hidden = row.querySelector('.nav-href-value-submit') as HTMLInputElement | null;
	if (!(host instanceof HTMLElement) || !hidden) return;

	host.innerHTML = '';

	if (kind === 'none') {
		hidden.value = '';
		return;
	}

	if (kind === 'custom' || kind === 'external') {
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'nav-href-input-default nav-href-target-control ui-input-compact w-full';
		input.placeholder = kind === 'external' ? 'https://…' : '/sciezka';
		input.value = hidden.value;
		host.appendChild(input);
		return;
	}

	const list = optionsForNavTargetKind(kind, options);
	const select = document.createElement('select');
	select.className = 'nav-href-select nav-href-target-control ui-select-compact w-full';

	if (list.length === 0) {
		const empty = document.createElement('option');
		empty.value = '';
		empty.textContent = kind === 'category' ? options.emptyCategory : options.emptyPage;
		select.appendChild(empty);
	} else {
		for (const item of list) {
			const opt = document.createElement('option');
			opt.value = item.value;
			opt.textContent = item.label;
			select.appendChild(opt);
		}
		select.value = pickNavTargetValue(kind, hidden.value, list);
		hidden.value = select.value;
		if (
			kind === 'page' &&
			select.value &&
			![...select.options].some((o) => o.value === select.value)
		) {
			const extra = document.createElement('option');
			extra.value = select.value;
			extra.textContent = select.value;
			select.appendChild(extra);
			select.value = extra.value;
		}
	}

	host.appendChild(select);
}

export function syncParentSelect(
	row: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
): void {
	const cell = row.querySelector('.nav-parent-cell');
	if (!(cell instanceof HTMLElement)) return;

	const rows = collectRowMeta(body);
	const editorRows = getEditorRows(body);
	const rowIndex = editorRows.indexOf(row);
	const depth = readRowDepth(row);
	const preferred = readParentValue(row);

	if (depth === 0) {
		cell.innerHTML = `<span class="ui-muted text-xs nav-parent-root">${labels.navParentRoot}</span><input type="hidden" name="nav_parent" class="nav-parent-submit" value="" />`;
		return;
	}

	const eligible = eligibleNavParentIndices(rows, rowIndex, depth);
	const select = document.createElement('select');
	select.name = 'nav_parent';
	select.className = 'nav-parent nav-href-select ui-select-compact w-full';
	select.required = true;

	if (eligible.length === 0) {
		const empty = document.createElement('option');
		empty.value = '';
		empty.textContent = labels.navParentMissing;
		empty.selected = true;
		empty.disabled = true;
		select.appendChild(empty);
	} else {
		let picked = false;
		for (const index of eligible) {
			const opt = document.createElement('option');
			opt.value = String(index);
			opt.textContent = formatNavParentOptionLabel(rows[index]!.label, index + 1);
			if (preferred === index) {
				opt.selected = true;
				picked = true;
			}
			select.appendChild(opt);
		}
		if (!picked) select.value = String(eligible[eligible.length - 1]!);
	}

	cell.innerHTML = '';
	cell.appendChild(select);
}

export function syncNavChildButton(summaryRow: HTMLElement, depth: number): void {
	const btn = summaryRow.querySelector('.add-nav-child') as HTMLButtonElement | null;
	if (!btn) return;
	btn.hidden = depth >= 2;
}

export function refreshAllParentSelects(body: HTMLElement, labels: NavigationTableLabels): void {
	getEditorRows(body).forEach((row) => {
		syncParentSelect(row, body, labels);
		syncSubmitFields(row);
		const summary = getSummaryForEditor(row);
		if (summary) syncNavChildButton(summary, readRowDepth(row));
	});
}

export function bindKindSelect(row: HTMLElement): void {
	const kindSelect = row.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	if (!kindSelect || kindSelect.dataset.navKindBound === '1') return;
	kindSelect.dataset.navKindBound = '1';
	kindSelect.addEventListener('change', () => {
		const options = readNavTargetOptions();
		if (!options) return;
		rebuildNavTarget(row, readRowKind(row), options);
		syncSubmitFields(row);
	});
}
