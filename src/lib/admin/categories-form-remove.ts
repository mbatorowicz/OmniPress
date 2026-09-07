import { confirmAction } from '@/lib/ui/confirm';
import type { CategoriesFormLabels } from './categories-form-client';
import {
	categoryRowPostCount,
	isLastCategoryRow,
	parseCategoryPostCounts,
} from './categories-form-model';
import { getEditorForSummary, getEditorRows } from './categories-form-dom';

function lastCategoryMessage(form: HTMLFormElement): HTMLElement | null {
	const el = form.querySelector('[data-categories-last-msg]');
	return el instanceof HTMLElement ? el : null;
}

export function showLastCategoryMessage(form: HTMLFormElement, message: string): void {
	const el = lastCategoryMessage(form);
	if (!el) return;
	el.textContent = message;
	el.classList.remove('hidden');
	el.hidden = false;
}

export function hideLastCategoryMessage(form: HTMLFormElement): void {
	const el = lastCategoryMessage(form);
	if (!el) return;
	el.classList.add('hidden');
	el.hidden = true;
}

export function removeCategoryEntry(
	summaryRow: HTMLElement,
	body: HTMLElement,
	labels: CategoriesFormLabels,
	form: HTMLFormElement,
): void {
	if (isLastCategoryRow(getEditorRows(body).length)) {
		showLastCategoryMessage(form, labels.lastCategory);
		return;
	}
	hideLastCategoryMessage(form);
	const editor = getEditorForSummary(summaryRow);
	const prev =
		editor?.querySelector<HTMLInputElement>('input[name="category_prev_slug"]')?.value.trim() ?? '';
	const slug =
		editor?.querySelector<HTMLInputElement>('input[name="category_slug"]')?.value.trim() ?? '';
	const count = categoryRowPostCount(parseCategoryPostCounts(form.dataset.postCounts), prev, slug);
	if (labels.removeConfirm && !confirmAction(labels.removeConfirm, count)) return;
	summaryRow.remove();
	editor?.remove();
}
