import { confirmAction } from '@/lib/ui/confirm';
import { parseCategoryPostCounts } from './categories-form-model';
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
	addToNewsFeed: string;
	addToMenu: string;
	remapConfirm: string;
	removeConfirm: string;
	lastCategory: string;
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
			if (interactionRoot instanceof HTMLFormElement) {
				bindCategoryRemapConfirm(interactionRoot, labels);
			}
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
		addToNewsFeed: '',
		addToMenu: '',
		remapConfirm: '',
		removeConfirm: '',
		lastCategory: '',
	});
}

function bindCategoryRemapConfirm(form: HTMLFormElement, labels: CategoriesFormLabels): void {
	if (!labels.remapConfirm || form.dataset.remapConfirmBound === '1') return;
	form.dataset.remapConfirmBound = '1';
	form.addEventListener('submit', (event) => {
		let affected = 0;
		const counts = parseCategoryPostCounts(form.dataset.postCounts);
		for (const editor of form.querySelectorAll('.category-row-editor')) {
			const prev = editor.querySelector<HTMLInputElement>('input[name="category_prev_slug"]')?.value.trim();
			const slug = editor.querySelector<HTMLInputElement>('input[name="category_slug"]')?.value.trim();
			if (prev && slug && prev !== slug) affected += counts[prev] ?? 0;
		}
		if (affected > 0 && !confirmAction(labels.remapConfirm, affected)) event.preventDefault();
	});
}
