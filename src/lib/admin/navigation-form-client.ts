import {
	eligibleNavParentIndices,
	formatNavParentOptionLabel,
} from '@/lib/admin/navigation-tree';
import {
	type NavTargetOptions,
	optionsForNavTargetKind,
	pickNavTargetValue,
} from '@/lib/admin/nav-target-options';

export type NavigationTableLabels = {
	remove: string;
	depth0: string;
	depth1: string;
	depth2: string;
	megaHint: string;
	addNavChild: string;
	navParentRoot: string;
	navParentMissing: string;
	hrefKinds: {
		none: string;
		category: string;
		page: string;
		static: string;
		custom: string;
		external: string;
	};
};

const DEPTH_CLASSES = ['nav-row--depth-0', 'nav-row--depth-1', 'nav-row--depth-2'] as const;

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

function readParentValue(row: HTMLElement): string {
	const depth = readRowDepth(row);
	if (depth === 0) return '';
	const parent = row.querySelector('.nav-parent') as HTMLSelectElement | null;
	return parent?.value ?? row.dataset.navParent ?? '';
}

function collectRowMeta(body: HTMLElement): { label: string; depth: number }[] {
	return [...body.querySelectorAll('.nav-row')].map((row) => ({
		label: (row.querySelector('input[name="nav_label"]') as HTMLInputElement | null)?.value ?? '',
		depth: readRowDepth(row as HTMLElement),
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
	row.dataset.navParent = readParentValue(row);
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
	const rowIndex = [...body.querySelectorAll('.nav-row')].indexOf(row);
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
			if (preferred === String(index)) {
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

function syncNavChildButton(row: HTMLElement): void {
	const btn = row.querySelector('.add-nav-child') as HTMLButtonElement | null;
	if (!btn) return;
	btn.hidden = readRowDepth(row) >= 2;
}

function refreshAllParentSelects(body: HTMLElement, labels: NavigationTableLabels): void {
	body.querySelectorAll('.nav-row').forEach((row) => {
		syncParentSelect(row as HTMLElement, body, labels);
		syncNavChildButton(row as HTMLElement);
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

function createNavRowElement(labels: NavigationTableLabels): HTMLTableRowElement {
	const { hrefKinds } = labels;
	const tr = document.createElement('tr');
	tr.className = 'nav-row ui-table-dense-row nav-row--depth-0';
	tr.dataset.navKind = 'none';
	tr.dataset.navHref = '';
	tr.dataset.navParent = '';
	tr.innerHTML = `
		<td class="ui-table-dense-td--wide">
			<select name="nav_depth" class="ui-select-compact w-full nav-depth">
				<option value="0">${labels.depth0}</option>
				<option value="1">${labels.depth1}</option>
				<option value="2">${labels.depth2}</option>
			</select>
		</td>
		<td class="ui-table-dense-td--wide nav-parent-cell">
			<span class="ui-muted text-xs nav-parent-root">${labels.navParentRoot}</span>
			<input type="hidden" name="nav_parent" class="nav-parent-submit" value="" />
		</td>
		<td class="ui-table-dense-td--wide nav-label-cell"><input name="nav_label" required class="ui-input-compact w-full" /></td>
		<td class="ui-table-dense-td--wide">
			<input type="hidden" name="nav_href_kind" class="nav-href-kind-submit" value="none" />
			<select class="nav-href-kind ui-select-compact w-full">
				<option value="none">${hrefKinds.none}</option>
				<option value="category">${hrefKinds.category}</option>
				<option value="page">${hrefKinds.page}</option>
				<option value="static">${hrefKinds.static}</option>
				<option value="custom">${hrefKinds.custom}</option>
				<option value="external">${hrefKinds.external}</option>
			</select>
		</td>
		<td class="ui-table-dense-td--wide nav-href-values">
			<input type="hidden" name="nav_href_value" class="nav-href-value-submit" value="" />
			<div class="nav-href-target-host"></div>
		</td>
		<td class="nav-mega-cell ui-table-dense-td--wide text-center">
			<label class="inline-flex flex-col items-center gap-1">
				<input type="checkbox" name="nav_is_mega" class="nav-mega ui-checkbox" />
				<span class="ui-hint max-w-[6rem] text-[10px] leading-tight">${labels.megaHint}</span>
			</label>
		</td>
		<td class="ui-table-dense-td--wide nav-row-actions">
			<div class="flex flex-col items-start gap-1">
				<button type="button" class="add-nav-child ui-btn ui-btn--link text-xs">${labels.addNavChild}</button>
				<button type="button" class="remove-nav-row ui-btn ui-btn--link-danger">${labels.remove}</button>
			</div>
		</td>
	`;
	return tr;
}

function findInsertBefore(body: HTMLElement, parentRow: HTMLElement): HTMLElement | null {
	const rows = [...body.querySelectorAll('.nav-row')];
	const parentIndex = rows.indexOf(parentRow);
	if (parentIndex < 0) return null;
	const parentDepth = readRowDepth(parentRow);
	for (let i = parentIndex + 1; i < rows.length; i++) {
		if (readRowDepth(rows[i]!) <= parentDepth) return rows[i]!;
	}
	return null;
}

function initNavigationRow(
	row: HTMLElement,
	options: NavTargetOptions,
	body: HTMLElement,
	labels: NavigationTableLabels,
): void {
	const kindSelect = row.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	const kindHidden = row.querySelector('.nav-href-kind-submit') as HTMLInputElement | null;
	const hidden = row.querySelector('.nav-href-value-submit') as HTMLInputElement | null;
	const initialKind = row.dataset.navKind || kindSelect?.dataset.initialKind || 'none';
	const initialHref = row.dataset.navHref || hidden?.value || '';

	if (kindSelect && initialKind !== 'none') {
		kindSelect.value = initialKind;
	}
	if (kindHidden && initialKind !== 'none') {
		kindHidden.value = initialKind;
	}
	if (hidden && initialHref && !hidden.value.trim()) {
		hidden.value = initialHref;
	}

	const kind = readRowKind(row);
	rebuildNavTarget(row, kind, options);
	bindKindSelect(row);
	syncParentSelect(row, body, labels);
	syncSubmitFields(row);
	syncNavDepthVisual(row);
	syncMegaCell(row);
	syncNavChildButton(row);
}

function syncNavDepthVisual(row: HTMLElement): void {
	const depth = readRowDepth(row);
	for (const cls of DEPTH_CLASSES) row.classList.remove(cls);
	row.classList.add(DEPTH_CLASSES[depth]!);
}

function syncMegaCell(row: HTMLElement): void {
	const depthSelect = row.querySelector('.nav-depth') as HTMLSelectElement | null;
	const cell = row.querySelector('.nav-mega-cell');
	const checkbox = row.querySelector('.nav-mega') as HTMLInputElement | null;
	if (!depthSelect || !cell || !checkbox) return;

	const isMain = depthSelect.value === '0';
	cell.classList.toggle('hidden', !isMain);
	checkbox.disabled = !isMain;
	if (isMain) {
		checkbox.setAttribute('name', 'nav_is_mega');
	} else {
		checkbox.checked = false;
		checkbox.removeAttribute('name');
	}
}

function appendNavRow(body: HTMLElement, labels: NavigationTableLabels, options: NavTargetOptions): void {
	const tr = createNavRowElement(labels);
	body.appendChild(tr);
	initNavigationRow(tr, options, body, labels);
}

function appendNavChildRow(
	parentRow: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	const parentDepth = readRowDepth(parentRow);
	if (parentDepth >= 2) return;

	const parentIndex = [...body.querySelectorAll('.nav-row')].indexOf(parentRow);
	const tr = createNavRowElement(labels);
	const depthSelect = tr.querySelector('.nav-depth') as HTMLSelectElement | null;
	if (depthSelect) depthSelect.value = String(parentDepth + 1);
	tr.dataset.navParent = String(parentIndex);

	const insertBefore = findInsertBefore(body, parentRow);
	if (insertBefore) body.insertBefore(tr, insertBefore);
	else body.appendChild(tr);

	initNavigationRow(tr, options, body, labels);
	refreshAllParentSelects(body, labels);
}

function handleNavigationChange(event: Event, body: HTMLElement, labels: NavigationTableLabels): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	if (target.closest('.nav-href-target-control')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) syncSubmitFields(row);
		return;
	}

	if (target.closest('.nav-parent')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) syncSubmitFields(row);
		return;
	}

	if (target.closest('input[name="nav_label"]')) {
		refreshAllParentSelects(body, labels);
		return;
	}

	if (target.closest('.nav-depth')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) {
			syncNavDepthVisual(row);
			syncMegaCell(row);
			refreshAllParentSelects(body, labels);
			syncSubmitFields(row);
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
		appendNavRow(body, labels, options);
		return;
	}

	const addChildBtn = target.closest('.add-nav-child');
	if (addChildBtn) {
		event.preventDefault();
		const parentRow = addChildBtn.closest('.nav-row');
		if (parentRow instanceof HTMLElement) {
			appendNavChildRow(parentRow, body, labels, options);
		}
		return;
	}

	const removeBtn = target.closest('.remove-nav-row');
	if (!removeBtn) return;
	const row = removeBtn.closest('.nav-row');
	if (!(row instanceof HTMLElement)) return;
	if (body.querySelectorAll('.nav-row').length <= 1) return;
	row.remove();
	refreshAllParentSelects(body, labels);
}

export function mountNavigationForm(labels: NavigationTableLabels): void {
	const mount = (): void => {
		const body = document.getElementById('navigation-body');
		const options = readNavTargetOptions();
		if (!(body instanceof HTMLElement) || !options) return;

		const form = body.closest('form');
		const interactionRoot =
			form instanceof HTMLFormElement ? form : (body.parentElement ?? document);

		body.querySelectorAll('.nav-row').forEach((row) => {
			initNavigationRow(row as HTMLElement, options, body, labels);
		});
		refreshAllParentSelects(body, labels);

		if (form instanceof HTMLFormElement && form.dataset.navigationSubmitSync !== '1') {
			form.dataset.navigationSubmitSync = '1';
			form.addEventListener(
				'submit',
				() => {
					body.querySelectorAll('.nav-row').forEach((row) => {
						syncSubmitFields(row as HTMLElement);
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
		depth0: 'Poziom 0',
		depth1: 'Poziom 1',
		depth2: 'Poziom 2',
		megaHint: '',
		addNavChild: '+ Dodaj podpozycję',
		navParentRoot: '—',
		navParentMissing: 'Brak pozycji nadrzędnej',
		hrefKinds: {
			none: 'Bez linku',
			category: 'Kategoria',
			page: 'Strona',
			static: 'Stała trasa',
			custom: 'URL',
			external: 'Zewnętrzny',
		},
	};
	initNavigationRow(row, options, body, fallbackLabels);
}
