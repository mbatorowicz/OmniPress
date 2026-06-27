import {
	computeNavRowOrder,
	eligibleNavParentIndices,
	formatNavParentOptionLabel,
} from '@/lib/admin/navigation-tree';
import { applyNavEditorDepthAccentToElement } from '@/lib/admin/nav-editor-colors';
import {
	formatNavDropdownLayoutSummary,
	resolveNavDropdownLayout,
} from '@/lib/admin/nav-dropdown-layout';
import {
	type NavTargetOptions,
	formatNavTargetSummary,
	optionsForNavTargetKind,
	pickNavTargetValue,
} from '@/lib/admin/nav-target-options';

export type NavigationTableLabels = {
	remove: string;
	edit: string;
	closeEdit: string;
	depth0: string;
	depth1: string;
	depth2: string;
	menuColumnOne: string;
	menuColumnTwo: string;
	menuColumnsHint: string;
	addNavChild: string;
	navParentRoot: string;
	navParentMissing: string;
	navParentPrefix: string;
	hrefKinds: {
		none: string;
		category: string;
		page: string;
		static: string;
		custom: string;
		external: string;
	};
	fieldLabels: {
		navDepth: string;
		navParent: string;
		navLabel: string;
		navLinkType: string;
		navLinkTarget: string;
		navMenuColumns: string;
		navMenuColumnCount: string;
		navMenuColumnWidth1: string;
		navMenuColumnWidth2: string;
	};
};

const DEPTH_CLASSES = ['nav-row--depth-0', 'nav-row--depth-1', 'nav-row--depth-2'] as const;

let nextNavEntryId = 0;

function readNavTargetOptions(): NavTargetOptions | null {
	const script = document.getElementById('nav-target-options-json');
	if (script?.textContent?.trim()) {
		try {
			return JSON.parse(script.textContent) as NavTargetOptions;
		} catch {
			/* fall through */
		}
	}

	const body = document.getElementById('navigation-body');
	const table = document.getElementById('navigation-table');
	const host =
		body instanceof HTMLElement && body.dataset.navTargetOptions
			? body
			: table instanceof HTMLElement && table.dataset.navTargetOptions
				? table
				: null;
	if (!host) return null;
	const raw = host.dataset.navTargetOptions;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as NavTargetOptions;
	} catch {
		return null;
	}
}

function getEditorRows(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll('.nav-row-editor')];
}

function getNavEntries(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll('.nav-entry')];
}

function getSummaryForEditor(editorRow: HTMLElement): HTMLElement | null {
	const entry = editorRow.closest('.nav-entry');
	const summary = entry?.querySelector('.nav-row-summary');
	return summary instanceof HTMLElement ? summary : null;
}

function getEditorForSummary(summaryRow: HTMLElement): HTMLElement | null {
	const entry = summaryRow.closest('.nav-entry');
	const editor = entry?.querySelector('.nav-row-editor');
	return editor instanceof HTMLElement ? editor : null;
}

function readRowKind(row: HTMLElement): string {
	const kindUi = row.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	return kindUi?.value ?? 'none';
}

function readRowDepth(row: HTMLElement): number {
	const depthSelect = row.querySelector('.nav-depth') as HTMLSelectElement | null;
	return Math.min(2, Math.max(0, Number(depthSelect?.value ?? 0) || 0));
}

function readTargetControlValue(row: HTMLElement): string {
	const control = row.querySelector('.nav-href-target-control');
	if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
		return control.value;
	}
	return '';
}

function readParentValue(row: HTMLElement): number | null {
	const depth = readRowDepth(row);
	if (depth === 0) return null;
	const parent = row.querySelector('.nav-parent') as HTMLSelectElement | null;
	const raw = parent?.value ?? row.dataset.navParent ?? '';
	if (raw === '') return null;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : null;
}

function collectRowMeta(body: HTMLElement): { label: string; depth: number; parentRowIndex: number | null }[] {
	return getEditorRows(body).map((row) => ({
		label: (row.querySelector('input[name="nav_label"]') as HTMLInputElement | null)?.value ?? '',
		depth: readRowDepth(row),
		parentRowIndex: readParentValue(row),
	}));
}

function syncSubmitFields(row: HTMLElement): void {
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

export function rebuildNavTarget(
	row: HTMLElement,
	kind: string,
	options: NavTargetOptions,
): void {
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
		input.className =
			'nav-href-input-default nav-href-target-control ui-input-compact w-full';
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

function syncParentSelect(
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

function syncNavChildButton(summaryRow: HTMLElement, depth: number): void {
	const btn = summaryRow.querySelector('.add-nav-child') as HTMLButtonElement | null;
	if (!btn) return;
	btn.hidden = depth >= 2;
}

function refreshAllParentSelects(body: HTMLElement, labels: NavigationTableLabels): void {
	getEditorRows(body).forEach((row) => {
		syncParentSelect(row, body, labels);
		syncSubmitFields(row);
		const summary = getSummaryForEditor(row);
		if (summary) syncNavChildButton(summary, readRowDepth(row));
	});
}

function handleKindChange(row: HTMLElement): void {
	const options = readNavTargetOptions();
	if (!options) return;
	const kind = readRowKind(row);
	rebuildNavTarget(row, kind, options);
	syncSubmitFields(row);
}

function bindKindSelect(row: HTMLElement): void {
	const kindSelect = row.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	if (!kindSelect || kindSelect.dataset.navKindBound === '1') return;
	kindSelect.dataset.navKindBound = '1';
	kindSelect.addEventListener('change', () => {
		handleKindChange(row);
	});
}

function syncNavRowSummary(
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

	let layoutEl = summary.querySelector('.nav-summary-layout');
	const tileMain = summary.querySelector('.nav-tile-main');
	if (depth === 0) {
		const layout = readDropdownLayoutFromRow(editorRow);
		const layoutSummary = formatNavDropdownLayoutSummary(layout, {
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
	if (summary) syncNavChildButton(summary, depth);
}

function getNavEntry(element: HTMLElement): HTMLElement | null {
	const entry = element.closest('.nav-entry');
	return entry instanceof HTMLElement ? entry : null;
}

function syncNavDepthVisual(editorRow: HTMLElement): void {
	const entry = getNavEntry(editorRow);
	if (!entry) return;
	const depth = readRowDepth(editorRow);
	for (const cls of DEPTH_CLASSES) entry.classList.remove(cls);
	entry.classList.add(DEPTH_CLASSES[depth]!);
}

function readDropdownLayoutFromRow(row: HTMLElement) {
	const columnsSelect = row.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const width0 = row.querySelector('.nav-menu-col-width-0') as HTMLInputElement | null;
	const width1 = row.querySelector('.nav-menu-col-width-1') as HTMLInputElement | null;
	const columns = columnsSelect?.value === '2' ? 2 : 1;
	const columnWidths = [width0?.value.trim(), width1?.value.trim()].filter(
		(value): value is string => Boolean(value),
	);
	return resolveNavDropdownLayout({ menuColumns: columns, menuColumnWidths: columnWidths });
}

function syncDropdownLayoutSubmit(row: HTMLElement): void {
	const columnsSubmit = row.querySelector('.nav-menu-columns-submit') as HTMLInputElement | null;
	const width0Submit = row.querySelector('.nav-menu-col-width-0-submit') as HTMLInputElement | null;
	const width1Submit = row.querySelector('.nav-menu-col-width-1-submit') as HTMLInputElement | null;
	const columnsSelect = row.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const width0 = row.querySelector('.nav-menu-col-width-0') as HTMLInputElement | null;
	const width1 = row.querySelector('.nav-menu-col-width-1') as HTMLInputElement | null;
	if (!columnsSubmit) return;

	const columns = columnsSelect?.value === '2' ? '2' : '1';
	columnsSubmit.value = columns;
	if (width0Submit) width0Submit.value = width0?.value.trim() ?? '';
	if (width1Submit) width1Submit.value = columns === '2' ? (width1?.value.trim() ?? '') : '';
}

function syncDropdownLayoutCell(row: HTMLElement): void {
	const depthSelect = row.querySelector('.nav-depth') as HTMLSelectElement | null;
	const cell = row.querySelector('.nav-dropdown-layout-cell');
	const columnsSelect = row.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const width1Field = row.querySelector('.nav-menu-col-width-1-field');
	if (!depthSelect || !cell) return;

	const isMain = depthSelect.value === '0';
	cell.classList.toggle('hidden', !isMain);

	if (columnsSelect) columnsSelect.disabled = !isMain;
	for (const input of row.querySelectorAll('.nav-menu-col-width-0, .nav-menu-col-width-1')) {
		if (input instanceof HTMLInputElement) input.disabled = !isMain;
	}

	if (!isMain) {
		const columnsSubmit = row.querySelector('.nav-menu-columns-submit') as HTMLInputElement | null;
		const width0Submit = row.querySelector('.nav-menu-col-width-0-submit') as HTMLInputElement | null;
		const width1Submit = row.querySelector('.nav-menu-col-width-1-submit') as HTMLInputElement | null;
		if (columnsSubmit) columnsSubmit.value = '1';
		if (width0Submit) width0Submit.value = '';
		if (width1Submit) width1Submit.value = '';
		return;
	}

	const twoColumns = columnsSelect?.value === '2';
	width1Field?.classList.toggle('hidden', !twoColumns);
	const width1Input = row.querySelector('.nav-menu-col-width-1') as HTMLInputElement | null;
	if (width1Input) width1Input.disabled = !twoColumns;

	syncDropdownLayoutSubmit(row);
}

function bindDropdownLayoutInputs(row: HTMLElement): void {
	const cell = row.querySelector('.nav-dropdown-layout-cell');
	if (!(cell instanceof HTMLElement) || cell.dataset.dropdownLayoutBound === '1') return;
	cell.dataset.dropdownLayoutBound = '1';

	const columnsSelect = row.querySelector('.nav-menu-columns');
	columnsSelect?.addEventListener('change', () => {
		syncDropdownLayoutCell(row);
	});

	for (const input of row.querySelectorAll('.nav-menu-col-width-0, .nav-menu-col-width-1')) {
		input.addEventListener('input', () => syncDropdownLayoutSubmit(row));
	}
}

function closeAllEditors(body: HTMLElement, labels: NavigationTableLabels, options: NavTargetOptions): void {
	getEditorRows(body).forEach((row) => {
		if (!row.classList.contains('hidden')) {
			syncNavRowSummary(row, labels, options);
		}
		row.classList.add('hidden');
	});
}

function openNavEditor(
	editorRow: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	closeAllEditors(body, labels, options);
	editorRow.classList.remove('hidden');
	editorRow.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}

function reorderNavEntries(body: HTMLElement, labels: NavigationTableLabels): void {
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

function buildEditorPanelHtml(labels: NavigationTableLabels): string {
	const { hrefKinds, fieldLabels } = labels;
	return `
		<div class="nav-row-editor-panel">
			<div class="nav-row-editor-grid">
				<label class="nav-row-editor-field">
					<span class="nav-row-editor-label">${fieldLabels.navDepth}</span>
					<select name="nav_depth" class="ui-select-compact w-full nav-depth">
						<option value="0">${labels.depth0}</option>
						<option value="1">${labels.depth1}</option>
						<option value="2">${labels.depth2}</option>
					</select>
				</label>
				<div class="nav-row-editor-field">
					<span class="nav-row-editor-label">${fieldLabels.navParent}</span>
					<div class="nav-parent-cell ui-table-dense-td--wide">
						<span class="ui-muted text-xs nav-parent-root">${labels.navParentRoot}</span>
						<input type="hidden" name="nav_parent" class="nav-parent-submit" value="" />
					</div>
				</div>
				<label class="nav-row-editor-field nav-row-editor-field--wide">
					<span class="nav-row-editor-label">${fieldLabels.navLabel}</span>
					<input name="nav_label" required class="ui-input-compact w-full" />
				</label>
				<label class="nav-row-editor-field">
					<span class="nav-row-editor-label">${fieldLabels.navLinkType}</span>
					<input type="hidden" name="nav_href_kind" class="nav-href-kind-submit" value="none" />
					<select class="nav-href-kind ui-select-compact w-full">
						<option value="none">${hrefKinds.none}</option>
						<option value="category">${hrefKinds.category}</option>
						<option value="page">${hrefKinds.page}</option>
						<option value="static">${hrefKinds.static}</option>
						<option value="custom">${hrefKinds.custom}</option>
						<option value="external">${hrefKinds.external}</option>
					</select>
				</label>
				<label class="nav-row-editor-field nav-row-editor-field--wide">
					<span class="nav-row-editor-label">${fieldLabels.navLinkTarget}</span>
					<div class="nav-href-values">
						<input type="hidden" name="nav_href_value" class="nav-href-value-submit" value="" />
						<div class="nav-href-target-host"></div>
					</div>
				</label>
				<div class="nav-row-editor-field nav-row-editor-field--wide nav-dropdown-layout-field-wrap">
					<span class="nav-row-editor-label">${fieldLabels.navMenuColumns}</span>
					<div class="nav-dropdown-layout-cell">
						<input type="hidden" name="nav_menu_columns" class="nav-menu-columns-submit" value="1" />
						<input type="hidden" name="nav_menu_col_width_0" class="nav-menu-col-width-0-submit" value="" />
						<input type="hidden" name="nav_menu_col_width_1" class="nav-menu-col-width-1-submit" value="" />
						<div class="nav-dropdown-layout-grid">
							<label class="nav-dropdown-layout-field">
								<span class="nav-dropdown-layout-label">${fieldLabels.navMenuColumnCount}</span>
								<select class="nav-menu-columns ui-select-compact w-full">
									<option value="1">${labels.menuColumnOne}</option>
									<option value="2">${labels.menuColumnTwo}</option>
								</select>
							</label>
							<label class="nav-dropdown-layout-field">
								<span class="nav-dropdown-layout-label">${fieldLabels.navMenuColumnWidth1}</span>
								<input type="text" placeholder="320px" class="nav-menu-col-width-0 ui-input-compact w-full" autocomplete="off" />
							</label>
							<label class="nav-dropdown-layout-field nav-menu-col-width-1-field hidden">
								<span class="nav-dropdown-layout-label">${fieldLabels.navMenuColumnWidth2}</span>
								<input type="text" placeholder="1fr" class="nav-menu-col-width-1 ui-input-compact w-full" autocomplete="off" />
							</label>
						</div>
						<p class="ui-hint mt-1 text-[10px] leading-tight">${labels.menuColumnsHint}</p>
					</div>
				</div>
			</div>
			<div class="nav-row-editor-footer">
				<button type="button" class="close-nav-row ui-btn ui-btn--ghost text-xs">${labels.closeEdit}</button>
			</div>
		</div>
	`;
}

function createNavEntryElement(
	labels: NavigationTableLabels,
	openEditor: boolean,
): HTMLElement {
	const entryId = String(nextNavEntryId++);
	const entry = document.createElement('div');
	entry.className = 'nav-entry nav-row--depth-0';
	entry.dataset.navEntry = entryId;
	entry.innerHTML = `
		<div class="nav-tile nav-row-summary">
			<div class="nav-tile-main">
				<span class="nav-summary-label">—</span>
				<span class="nav-summary-sep" aria-hidden="true">·</span>
				<span class="nav-summary-link-text">${labels.hrefKinds.none}</span>
				<span class="nav-summary-layout">${labels.menuColumnOne} (320px)</span>
			</div>
			<div class="nav-tile-actions">
				<button type="button" class="edit-nav-row ui-btn ui-btn--link text-xs">${labels.edit}</button>
				<button type="button" class="add-nav-child ui-btn ui-btn--link text-xs">${labels.addNavChild}</button>
				<button type="button" class="remove-nav-row ui-btn ui-btn--link-danger text-xs">${labels.remove}</button>
			</div>
		</div>
		<div class="nav-row-editor${openEditor ? '' : ' hidden'}" data-nav-kind="none" data-nav-href="" data-nav-parent="">
			${buildEditorPanelHtml(labels)}
		</div>
	`;
	return entry;
}

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

function initNavigationRow(
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

	if (kindSelect && initialKind !== 'none') {
		kindSelect.value = initialKind;
	}
	if (kindHidden && initialKind !== 'none') {
		kindHidden.value = initialKind;
	}
	if (hidden && initialHref && !hidden.value.trim()) {
		hidden.value = initialHref;
	}

	const kind = readRowKind(editorRow);
	rebuildNavTarget(editorRow, kind, options);
	bindKindSelect(editorRow);
	syncParentSelect(editorRow, body, labels);
	syncSubmitFields(editorRow);
	const summary = getSummaryForEditor(editorRow);
	syncNavDepthVisual(editorRow);
	syncDropdownLayoutCell(editorRow);
	bindDropdownLayoutInputs(editorRow);
	if (summary) syncNavChildButton(summary, readRowDepth(editorRow));
}

function appendNavEntry(
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

function appendNavChildRow(
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

function removeNavEntry(summaryRow: HTMLElement, body: HTMLElement, labels: NavigationTableLabels): void {
	if (getEditorRows(body).length <= 1) return;
	const entry = summaryRow.closest('.nav-entry');
	entry?.remove();
	refreshAllParentSelects(body, labels);
	reorderNavEntries(body, labels);
}

function handleNavigationChange(
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

function handleNavigationClick(
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

function bindDepthColorInputs(body: HTMLElement): void {
	const form = body.closest('form');
	const interactionRoot = form instanceof HTMLFormElement ? form : document;
	interactionRoot.querySelectorAll('.nav-depth-color-input').forEach((input) => {
		if (!(input instanceof HTMLInputElement)) return;
		if (input.dataset.navColorBound === '1') return;
		input.dataset.navColorBound = '1';
		input.addEventListener('input', () => {
			const depthRaw = input.dataset.navDepthColor;
			if (depthRaw === undefined) return;
			const depth = Number.parseInt(depthRaw, 10);
			if (Number.isNaN(depth)) return;
			applyNavEditorDepthAccentToElement(body, depth, input.value);
		});
	});
}

export function mountNavigationForm(labels: NavigationTableLabels): void {
	const mount = (): void => {
		const body = document.getElementById('navigation-body');
		const options = readNavTargetOptions();
		if (!(body instanceof HTMLElement) || !options) return;

		nextNavEntryId = getNavEntries(body).length;
		bindDepthColorInputs(body);

		const form = body.closest('form');
		const interactionRoot =
			form instanceof HTMLFormElement ? form : (body.parentElement ?? document);

		getEditorRows(body).forEach((row) => {
			initNavigationRow(row, options, body, labels);
			syncNavRowSummary(row, labels, options);
		});
		refreshAllParentSelects(body, labels);

		if (form instanceof HTMLFormElement && form.dataset.navigationSubmitSync !== '1') {
			form.dataset.navigationSubmitSync = '1';
			form.addEventListener(
				'submit',
				() => {
					getEditorRows(body).forEach((row) => {
						syncSubmitFields(row);
						syncDropdownLayoutSubmit(row);
					});
					const json = form.querySelector('[name=navigation_json]');
					if (json instanceof HTMLTextAreaElement) json.value = '';
				},
				{ capture: true },
			);
		}

		if (interactionRoot instanceof HTMLElement && interactionRoot.dataset.navigationFormBound !== '1') {
			interactionRoot.dataset.navigationFormBound = '1';
			interactionRoot.addEventListener('change', (event) => {
				handleNavigationChange(event, body, labels);
			});
			interactionRoot.addEventListener('input', (event) => {
				handleNavigationChange(event, body, labels);
			});
			interactionRoot.addEventListener('click', (event) => {
				const opts = readNavTargetOptions();
				if (opts) handleNavigationClick(event, labels, opts);
			});
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount, { once: true });
	} else {
		mount();
	}
	document.addEventListener('astro:page-load', mount);
}

/** @deprecated Użyj mountNavigationForm */
export function initNavigationTable(labels: NavigationTableLabels): void {
	mountNavigationForm(labels);
}

/** @deprecated */
export function syncHrefFields(_row: HTMLElement): void {}

/** @deprecated */
export function initNavigationRowFromServerState(
	row: HTMLElement,
	options: NavTargetOptions,
): void {
	const body = document.getElementById('navigation-body');
	if (!(body instanceof HTMLElement)) return;
	const fallbackLabels: NavigationTableLabels = {
		remove: 'Usuń',
		edit: 'Edytuj',
		closeEdit: 'Zamknij',
		depth0: 'Poziom 0',
		depth1: 'Poziom 1',
		depth2: 'Poziom 2',
		menuColumnOne: '1 kolumna',
		menuColumnTwo: '2 kolumny',
		menuColumnsHint: '',
		addNavChild: '+ Dodaj podpozycję',
		navParentRoot: '—',
		navParentMissing: 'Brak pozycji nadrzędnej',
		navParentPrefix: 'pod:',
		hrefKinds: {
			none: 'Bez linku',
			category: 'Kategoria',
			page: 'Strona',
			static: 'Stała trasa',
			custom: 'URL',
			external: 'Zewnętrzny',
		},
		fieldLabels: {
			navDepth: 'Poziom',
			navParent: 'Pozycja nadrzędna',
			navLabel: 'Etykieta',
			navLinkType: 'Typ linku',
			navLinkTarget: 'Adres / cel',
			navMenuColumns: 'Układ dropdownu',
			navMenuColumnCount: 'Liczba kolumn',
			navMenuColumnWidth1: 'Szerokość kolumny 1',
			navMenuColumnWidth2: 'Szerokość kolumny 2',
		},
	};
	initNavigationRow(row, options, body, fallbackLabels);
}
