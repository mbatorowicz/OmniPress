/** Checkboxy dodatkowych kategorii — wyłącza tę, która jest już główną. */

export function syncExtraCategoryOptions(form: HTMLFormElement): void {
	const primary = fieldSelectValue(form, 'category_slug');
	for (const input of form.querySelectorAll<HTMLInputElement>('input[name="extra_category_slug"]')) {
		const isPrimary = input.value === primary;
		input.disabled = isPrimary;
		if (isPrimary) input.checked = false;
		input.closest('label')?.classList.toggle('hidden', isPrimary);
	}
}

export function readExtraCategoryDraftValue(form: HTMLFormElement): string {
	return extraCategoryInputs(form)
		.filter((el) => el.checked && !el.disabled)
		.map((el) => el.value)
		.join(',');
}

export function applyExtraCategoryDraftValue(form: HTMLFormElement, csv: string): void {
	const selected = new Set(csv.split(',').filter(Boolean));
	for (const input of extraCategoryInputs(form)) {
		input.checked = selected.has(input.value);
	}
	syncExtraCategoryOptions(form);
}

function extraCategoryInputs(form: HTMLFormElement): HTMLInputElement[] {
	return [...form.querySelectorAll<HTMLInputElement>('input[name="extra_category_slug"]')];
}

function fieldSelectValue(form: HTMLFormElement, name: string): string {
	const el = form.elements.namedItem(name);
	return el instanceof HTMLSelectElement ? el.value : '';
}
