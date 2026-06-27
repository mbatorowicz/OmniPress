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

function readRowKind(row: HTMLElement): string {
	const kindUi = row.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	return kindUi?.value ?? 'none';
}

function readTargetControlValue(row: HTMLElement): string {
	const control = row.querySelector('.nav-href-target-control');
	if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
		return control.value;
	}
	return '';
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
	}

	host.appendChild(select);
}

function initNavigationRow(row: HTMLElement, options: NavTargetOptions): void {
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

	rebuildNavTarget(row, readRowKind(row), options);
	syncSubmitFields(row);
	syncNavDepthVisual(row);
	syncMegaCell(row);
}

function syncNavDepthVisual(row: HTMLElement): void {
	const depthSelect = row.querySelector('.nav-depth') as HTMLSelectElement | null;
	const depth = Math.min(2, Math.max(0, Number(depthSelect?.value ?? 0) || 0));
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
	const { hrefKinds } = labels;
	const tr = document.createElement('tr');
	tr.className = 'nav-row ui-table-dense-row nav-row--depth-0';
	tr.dataset.navKind = 'none';
	tr.dataset.navHref = '';
	tr.innerHTML = `
		<td class="ui-table-dense-td--wide">
			<select name="nav_depth" class="ui-select-compact w-full nav-depth">
				<option value="0">${labels.depth0}</option>
				<option value="1">${labels.depth1}</option>
				<option value="2">${labels.depth2}</option>
			</select>
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
		<td class="ui-table-dense-td--wide"><button type="button" class="remove-nav-row ui-btn ui-btn--link-danger">${labels.remove}</button></td>
	`;
	body.appendChild(tr);
	initNavigationRow(tr, options);
}

function handleNavigationChange(event: Event, options: NavTargetOptions): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	if (target.closest('.nav-href-kind')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) {
			const kind = readRowKind(row);
			rebuildNavTarget(row, kind, options);
			syncSubmitFields(row);
		}
		return;
	}

	if (target.closest('.nav-href-target-control')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) syncSubmitFields(row);
		return;
	}

	if (target.closest('.nav-depth')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) {
			syncNavDepthVisual(row);
			syncMegaCell(row);
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

	if (target.closest('#add-nav-row')) {
		event.preventDefault();
		const body = document.getElementById('navigation-body');
		if (body instanceof HTMLElement) appendNavRow(body, labels, options);
		return;
	}

	const removeBtn = target.closest('.remove-nav-row');
	if (!removeBtn) return;
	const body = document.getElementById('navigation-body');
	if (!(body instanceof HTMLElement)) return;
	const row = removeBtn.closest('.nav-row');
	if (!(row instanceof HTMLElement)) return;
	if (body.querySelectorAll('.nav-row').length <= 1) return;
	row.remove();
}

export function mountNavigationForm(
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	const mount = (): void => {
		const body = document.getElementById('navigation-body');
		if (!(body instanceof HTMLElement)) return;

		body.querySelectorAll('.nav-row').forEach((row) => {
			initNavigationRow(row as HTMLElement, options);
		});

		const form = body.closest('form');
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

		if (body.dataset.navigationFormBound === '1') return;
		body.dataset.navigationFormBound = '1';
		body.addEventListener('change', (event) => handleNavigationChange(event, options));
		body.addEventListener('input', (event) => handleNavigationChange(event, options));
		body.addEventListener('click', (event) => handleNavigationClick(event, labels, options));
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount, { once: true });
	} else {
		mount();
	}
}

/** @deprecated Użyj mountNavigationForm */
export function initNavigationTable(
	labels: NavigationTableLabels,
	options: NavTargetOptions,
): void {
	mountNavigationForm(labels, options);
}

/** @deprecated */
export function syncHrefFields(_row: HTMLElement): void {}

/** @deprecated */
export function initNavigationRowFromServerState(row: HTMLElement, options: NavTargetOptions): void {
	initNavigationRow(row, options);
}
