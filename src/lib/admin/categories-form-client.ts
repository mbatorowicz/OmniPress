export type CategoriesFormLabels = {
	remove: string;
};

function appendCategoryRow(body: HTMLElement, removeLabel: string): void {
	const tr = document.createElement('tr');
	tr.className = 'category-row ui-table-dense-row';
	tr.innerHTML = `
		<td class="ui-table-dense-td--wide"><input name="category_slug" required class="ui-input-compact ui-input-compact--mono w-full" /></td>
		<td class="ui-table-dense-td--wide"><input name="category_name" required class="ui-input-compact w-full" /></td>
		<td class="ui-table-dense-td--wide"><button type="button" class="remove-category ui-link--danger">${removeLabel}</button></td>
	`;
	body.appendChild(tr);
}

export function initCategoriesForm(form: HTMLFormElement, labels: CategoriesFormLabels): void {
	if (form.dataset.categoriesFormBound === '1') return;
	form.dataset.categoriesFormBound = '1';

	const body = form.querySelector('#categories-body');
	if (!(body instanceof HTMLElement)) return;

	form.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;

		if (target.closest('[data-add-category]')) {
			event.preventDefault();
			appendCategoryRow(body, labels.remove);
			return;
		}

		const removeBtn = target.closest('.remove-category');
		if (!removeBtn) return;
		const row = removeBtn.closest('.category-row');
		if (!(row instanceof HTMLElement)) return;
		if (body.querySelectorAll('.category-row').length <= 1) return;
		row.remove();
	});
}

export function mountCategoriesForm(labels: CategoriesFormLabels): void {
	function setup(): void {
		for (const form of document.querySelectorAll('[data-categories-form]')) {
			if (form instanceof HTMLFormElement) initCategoriesForm(form, labels);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', setup, { once: true });
	} else {
		setup();
	}
}

/** @deprecated Użyj mountCategoriesForm */
export function initCategoriesTable(removeCategoryLabel: string): void {
	mountCategoriesForm({ remove: removeCategoryLabel });
}
