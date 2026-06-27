export type CategoriesFormLabels = {
	remove: string;
};

function appendCategoryRow(body: HTMLElement, removeLabel: string): void {
	const tr = document.createElement('tr');
	tr.className = 'category-row ui-table-dense-row';
	tr.innerHTML = `
		<td class="ui-table-dense-td--wide"><input name="category_slug" required class="ui-input-compact ui-input-compact--mono w-full" /></td>
		<td class="ui-table-dense-td--wide"><input name="category_name" required class="ui-input-compact w-full" /></td>
		<td class="ui-table-dense-td--wide"><button type="button" class="remove-category ui-btn ui-btn--link-danger">${removeLabel}</button></td>
	`;
	body.appendChild(tr);
	const slugInput = tr.querySelector('input[name="category_slug"]');
	if (slugInput instanceof HTMLInputElement) slugInput.focus();
}

function handleCategoriesClick(event: Event, _labels: CategoriesFormLabels): void {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const removeBtn = target.closest('.remove-category');
	if (!removeBtn) return;
	const form = removeBtn.closest('[data-categories-form]');
	if (!(form instanceof HTMLFormElement)) return;
	const body = form.querySelector('#categories-body');
	if (!(body instanceof HTMLElement)) return;
	const row = removeBtn.closest('.category-row');
	if (!(row instanceof HTMLElement)) return;
	if (body.querySelectorAll('.category-row').length <= 1) return;
	row.remove();
}

export function mountCategoriesForm(labels: CategoriesFormLabels): void {
	const bind = (): void => {
		const form = document.querySelector('[data-categories-form]');
		const addBtn = document.getElementById('add-category');
		const body = document.getElementById('categories-body');
		if (!(body instanceof HTMLElement)) return;

		if (addBtn instanceof HTMLButtonElement && addBtn.dataset.categoriesAddBound !== '1') {
			addBtn.dataset.categoriesAddBound = '1';
			addBtn.addEventListener('click', (event) => {
				event.preventDefault();
				appendCategoryRow(body, labels.remove);
			});
		}

		const interactionRoot = form instanceof HTMLFormElement ? form : document;
		if (
			interactionRoot instanceof HTMLElement &&
			interactionRoot.dataset.categoriesFormBound !== '1'
		) {
			interactionRoot.dataset.categoriesFormBound = '1';
			interactionRoot.addEventListener('click', (event) => {
				handleCategoriesClick(event, labels);
			});
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bind, { once: true });
	} else {
		bind();
	}
	document.addEventListener('astro:page-load', bind);
}

/** @deprecated Użyj mountCategoriesForm */
export function initCategoriesTable(removeCategoryLabel: string): void {
	mountCategoriesForm({ remove: removeCategoryLabel });
}
