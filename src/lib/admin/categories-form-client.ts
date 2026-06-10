export function initCategoriesTable(removeCategoryLabel: string): void {
	const catBody = document.getElementById('categories-body');
	const addCatBtn = document.getElementById('add-category');
	if (!(catBody instanceof HTMLElement)) return;

	function bindRemoveCategory(row: HTMLElement): void {
		row.querySelector('.remove-category')?.addEventListener('click', () => {
			if (catBody.querySelectorAll('.category-row').length <= 1) return;
			row.remove();
		});
	}

	catBody.querySelectorAll('.category-row').forEach((row) => bindRemoveCategory(row as HTMLElement));

	addCatBtn?.addEventListener('click', () => {
		const tr = document.createElement('tr');
		tr.className = 'category-row ui-table-dense-row';
		tr.innerHTML = `
			<td class="ui-table-dense-td--wide"><input name="category_slug" required class="ui-input-compact ui-input-compact--mono w-full" /></td>
			<td class="ui-table-dense-td--wide"><input name="category_name" required class="ui-input-compact w-full" /></td>
			<td class="ui-table-dense-td--wide"><button type="button" class="remove-category ui-link--danger">${removeCategoryLabel}</button></td>
		`;
		catBody.appendChild(tr);
		bindRemoveCategory(tr);
	});
}
