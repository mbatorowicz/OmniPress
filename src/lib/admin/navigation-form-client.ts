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

function syncHrefFields(row: HTMLElement): void {
	const kind = (row.querySelector('.nav-href-kind') as HTMLSelectElement | null)?.value ?? 'none';
	row.querySelectorAll('.nav-href-field').forEach((el) => {
		const field = el;
		const match = field.classList.contains(`nav-href-field-${kind}`);
		field.classList.toggle('hidden', !match);
		if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
			field.disabled = !match;
			if (!match) field.removeAttribute('name');
			else field.setAttribute('name', 'nav_href_value');
		}
	});
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

function bindRow(row: HTMLElement, body: HTMLElement, labels: NavigationTableLabels): void {
	row.querySelector('.remove-nav-row')?.addEventListener('click', () => {
		if (body.querySelectorAll('.nav-row').length <= 1) return;
		row.remove();
	});
	row.querySelector('.nav-href-kind')?.addEventListener('change', () => syncHrefFields(row));
	row.querySelector('.nav-depth')?.addEventListener('change', () => {
		syncNavDepthVisual(row);
		syncMegaCell(row);
	});
	syncHrefFields(row);
	syncNavDepthVisual(row);
	syncMegaCell(row);
}

export function initNavigationTable(labels: NavigationTableLabels): void {
	const body = document.getElementById('navigation-body');
	const addBtn = document.getElementById('add-nav-row');
	if (!(body instanceof HTMLElement)) return;

	body.querySelectorAll('.nav-row').forEach((row) => bindRow(row as HTMLElement, body, labels));

	addBtn?.addEventListener('click', () => {
		const tr = document.createElement('tr');
		tr.className = 'nav-row ui-table-dense-row nav-row--depth-0';
		const { hrefKinds } = labels;
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
				<input name="nav_href_value" class="ui-input-compact w-full nav-href-field nav-href-field-none nav-href-field-custom nav-href-field-external" />
				<select name="nav_href_value" class="ui-select-compact w-full nav-href-field nav-href-field-category hidden" disabled></select>
				<select name="nav_href_value" class="ui-select-compact w-full nav-href-field nav-href-field-page hidden" disabled></select>
				<select name="nav_href_value" class="ui-select-compact w-full nav-href-field nav-href-field-static hidden" disabled></select>
			</td>
			<td class="nav-mega-cell ui-table-dense-td--wide text-center">
				<label class="inline-flex flex-col items-center gap-1">
					<input type="checkbox" name="nav_is_mega" class="nav-mega ui-checkbox" />
					<span class="text-[10px] leading-tight text-slate-500 max-w-[6rem]">${labels.megaHint}</span>
				</label>
			</td>
			<td class="ui-table-dense-td--wide"><button type="button" class="remove-nav-row ui-link--danger">${labels.remove}</button></td>
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
		bindRow(tr, body, labels);
	});
}
