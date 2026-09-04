import { getEditorRows } from './categories-form-dom';
import { handleCategoriesClick, initCategoryRow, resetCategoryEntryIds } from './categories-form-rows';

export type CategoriesFormLabels = {
	remove: string;
	edit: string;
	closeEdit: string;
	fieldSlug: string;
	fieldName: string;
	fieldArchiveLayout: string;
	fieldArchiveColumns: string;
	layoutTiles: string;
	layoutTitleList: string;
	columnsOne: string;
	columnsTwo: string;
	columnsThree: string;
	summaryTilesPrefix: string;
	summaryTitleList: string;
};

export function mountCategoriesForm(labels: CategoriesFormLabels): void {
	const bind = (): void => {
		const form = document.querySelector('[data-categories-form]');
		const body = document.getElementById('categories-body');
		if (!(body instanceof HTMLElement)) return;

		resetCategoryEntryIds(getEditorRows(body).length);

		getEditorRows(body).forEach((row) => {
			initCategoryRow(row, labels);
		});

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
	mountCategoriesForm({
		remove: removeCategoryLabel,
		edit: 'Edytuj',
		closeEdit: 'Zamknij',
		fieldSlug: 'Slug',
		fieldName: 'Nazwa',
		fieldArchiveLayout: 'Wyświetlanie',
		fieldArchiveColumns: 'Kolumny',
		layoutTiles: 'Kafelki',
		layoutTitleList: 'Lista tytułów',
		columnsOne: '1 kolumna',
		columnsTwo: '2 kolumny',
		columnsThree: '3 kolumny',
		summaryTilesPrefix: 'Kafelki',
		summaryTitleList: 'Lista tytułów',
	});
}
