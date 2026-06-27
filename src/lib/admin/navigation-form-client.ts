export function initNavigationTable(labels: {
	remove: string;
	add: string;
	depth0: string;
	depth1: string;
	depth2: string;
}): void {
	const body = document.getElementById('navigation-body');
	const addBtn = document.getElementById('add-nav-row');
	if (!(body instanceof HTMLElement)) return;

	function bindRemove(row: HTMLElement): void {
		row.querySelector('.remove-nav-row')?.addEventListener('click', () => {
			if (body.querySelectorAll('.nav-row').length <= 1) return;
			row.remove();
		});
		row.querySelector('.nav-href-kind')?.addEventListener('change', () => syncHrefFields(row));
		syncHrefFields(row);
	}

	function syncHrefFields(row: HTMLElement): void {
		const kind = (row.querySelector('.nav-href-kind') as HTMLSelectElement | null)?.value ?? 'none';
		row.querySelectorAll('.nav-href-field').forEach((el) => {
			el.classList.add('hidden');
		});
		const target = row.querySelector(`.nav-href-field-${kind}`);
		target?.classList.remove('hidden');
	}

	body.querySelectorAll('.nav-row').forEach((row) => bindRemove(row as HTMLElement));

	addBtn?.addEventListener('click', () => {
		const tr = document.createElement('tr');
		tr.className = 'nav-row ui-table-dense-row';
		tr.innerHTML = `
			<td class="ui-table-dense-td--wide">
				<select name="nav_depth" class="ui-select-compact w-full nav-depth">
					<option value="0">${labels.depth0}</option>
					<option value="1">${labels.depth1}</option>
					<option value="2">${labels.depth2}</option>
				</select>
			</td>
			<td class="ui-table-dense-td--wide"><input name="nav_label" required class="ui-input-compact w-full" /></td>
			<td class="ui-table-dense-td--wide">
				<select name="nav_href_kind" class="ui-select-compact w-full nav-href-kind">
					<option value="none">—</option>
					<option value="category">Kategoria</option>
					<option value="page">Strona</option>
					<option value="static">Stała trasa</option>
					<option value="custom">Własny URL</option>
					<option value="external">Zewnętrzny</option>
				</select>
			</td>
			<td class="ui-table-dense-td--wide nav-href-values">
				<input name="nav_href_value" class="ui-input-compact w-full nav-href-field nav-href-field-none nav-href-field-custom nav-href-field-external" />
				<select name="nav_href_value" class="ui-select-compact w-full nav-href-field nav-href-field-category hidden"></select>
				<select name="nav_href_value" class="ui-select-compact w-full nav-href-field nav-href-field-page hidden"></select>
				<select name="nav_href_value" class="ui-select-compact w-full nav-href-field nav-href-field-static hidden"></select>
			</td>
			<td class="ui-table-dense-td--wide text-center"><input type="checkbox" name="nav_is_mega" class="nav-mega ui-checkbox" /></td>
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
		bindRemove(tr);
	});
}
