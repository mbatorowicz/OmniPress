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

function ensureSelectOption(select: HTMLSelectElement, value: string, label?: string): void {
	if (!value) return;
	for (const opt of select.options) {
		if (opt.value === value) return;
	}
	const opt = document.createElement('option');
	opt.value = value;
	opt.textContent = label ?? value;
	select.appendChild(opt);
}

function readActiveHrefValue(row: HTMLElement, kind: string): string {
	if (kind === 'none') return '';
	const field = row.querySelector(`.nav-href-field-${kind}`);
	if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
		return field.value;
	}
	return '';
}

function syncHrefValueSubmit(row: HTMLElement): void {
	const kind = (row.querySelector('.nav-href-kind') as HTMLSelectElement | null)?.value ?? 'none';
	const hidden = row.querySelector('.nav-href-value-submit');
	if (hidden instanceof HTMLInputElement) {
		hidden.value = readActiveHrefValue(row, kind);
	}
}

function initHrefFieldsFromHidden(row: HTMLElement): void {
	const kind = (row.querySelector('.nav-href-kind') as HTMLSelectElement | null)?.value ?? 'none';
	const hidden = row.querySelector('.nav-href-value-submit');
	if (!(hidden instanceof HTMLInputElement)) return;

	const value = hidden.value;
	if (kind === 'none' || !value) return;

	const field = row.querySelector(`.nav-href-field-${kind}`);
	if (field instanceof HTMLSelectElement) {
		ensureSelectOption(field, value);
		field.value = value;
	} else if (field instanceof HTMLInputElement) {
		field.value = value;
	}
}

export function syncHrefFields(row: HTMLElement, options?: { skipSubmitSync?: boolean }): void {
	const kind = (row.querySelector('.nav-href-kind') as HTMLSelectElement | null)?.value ?? 'none';
	row.querySelectorAll('.nav-href-field').forEach((el) => {
		const field = el;
		const match = field.classList.contains(`nav-href-field-${kind}`);
		field.classList.toggle('hidden', !match);
		if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
			field.disabled = !match;
		}
	});
	if (!options?.skipSubmitSync) syncHrefValueSubmit(row);
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

function syncAllHrefSubmitValues(body: HTMLElement): void {
	body.querySelectorAll('.nav-row').forEach((row) => {
		syncHrefValueSubmit(row as HTMLElement);
	});
}

function appendNavRow(body: HTMLElement, labels: NavigationTableLabels): void {
	const { hrefKinds } = labels;
	const tr = document.createElement('tr');
	tr.className = 'nav-row ui-table-dense-row nav-row--depth-0';
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
			<select name="nav_href_kind" class="ui-select-compact w-full nav-href-kind">
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
			<input class="nav-href-input-default nav-href-field nav-href-field-custom hidden" disabled />
			<input class="nav-href-input-default nav-href-field nav-href-field-external hidden" disabled />
			<select class="nav-href-select nav-href-field nav-href-field-category hidden" disabled></select>
			<select class="nav-href-select nav-href-field nav-href-field-page hidden" disabled></select>
			<select class="nav-href-select nav-href-field nav-href-field-static hidden" disabled></select>
		</td>
		<td class="nav-mega-cell ui-table-dense-td--wide text-center">
			<label class="inline-flex flex-col items-center gap-1">
				<input type="checkbox" name="nav_is_mega" class="nav-mega ui-checkbox" />
				<span class="ui-hint max-w-[6rem] text-[10px] leading-tight">${labels.megaHint}</span>
			</label>
		</td>
		<td class="ui-table-dense-td--wide"><button type="button" class="remove-nav-row ui-btn ui-btn--link-danger">${labels.remove}</button></td>
	`;
	const templateRow = body.querySelector('.nav-row');
	if (templateRow) {
		const catSelect = tr.querySelector('.nav-href-field-category');
		const pageSelect = tr.querySelector('.nav-href-field-page');
		const staticSelect = tr.querySelector('.nav-href-field-static');
		const tplCat = templateRow.querySelector('.nav-href-field-category');
		const tplPage = templateRow.querySelector('.nav-href-field-page');
		const tplStatic = templateRow.querySelector('.nav-href-field-static');
		if (catSelect && tplCat) catSelect.innerHTML = tplCat.innerHTML;
		if (pageSelect && tplPage) pageSelect.innerHTML = tplPage.innerHTML;
		if (staticSelect && tplStatic) staticSelect.innerHTML = tplStatic.innerHTML;
	}
	body.appendChild(tr);
	syncHrefFields(tr);
	syncNavDepthVisual(tr);
	syncMegaCell(tr);
}

function handleNavigationChange(event: Event): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	if (target.closest('.nav-href-kind') || target.closest('.nav-href-field')) {
		const row = target.closest('.nav-row');
		if (row instanceof HTMLElement) syncHrefFields(row);
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

function handleNavigationClick(event: Event, labels: NavigationTableLabels): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	if (target.closest('#add-nav-row')) {
		event.preventDefault();
		const body = document.getElementById('navigation-body');
		if (body instanceof HTMLElement) appendNavRow(body, labels);
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

export function mountNavigationForm(labels: NavigationTableLabels): void {
	const mount = (): void => {
		const body = document.getElementById('navigation-body');
		if (!(body instanceof HTMLElement)) return;

		body.querySelectorAll('.nav-row').forEach((row) => {
			initHrefFieldsFromHidden(row as HTMLElement);
			syncNavDepthVisual(row as HTMLElement);
			syncMegaCell(row as HTMLElement);
		});

		const form = body.closest('form');
		if (form instanceof HTMLFormElement && form.dataset.navigationSubmitSync !== '1') {
			form.dataset.navigationSubmitSync = '1';
			form.addEventListener(
				'submit',
				() => {
					syncAllHrefSubmitValues(body);
				},
				{ capture: true },
			);
		}

		if (document.documentElement.dataset.navigationFormMounted === '1') return;
		document.documentElement.dataset.navigationFormMounted = '1';
		document.addEventListener('change', handleNavigationChange);
		document.addEventListener('click', (event) => handleNavigationClick(event, labels));
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount, { once: true });
	} else {
		mount();
	}
}

/** @deprecated Użyj mountNavigationForm */
export function initNavigationTable(labels: NavigationTableLabels): void {
	mountNavigationForm(labels);
}
