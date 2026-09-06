/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
	mountCategoriesForm,
	type CategoriesFormLabels,
} from '@/lib/admin/categories-form-client';

const labels: CategoriesFormLabels = {
	remove: 'Usuń',
	edit: 'Edytuj',
	closeEdit: 'Zamknij',
	fieldSlug: 'Slug',
	fieldName: 'Nazwa',
	fieldArchiveLayout: 'Układ archiwum',
	fieldArchiveColumns: 'Kolumny',
	layoutTiles: 'Kafelki',
	layoutTitleList: 'Lista tytułów',
	columnsOne: '1',
	columnsTwo: '2',
	columnsThree: '3',
	summaryTilesPrefix: 'Kafelki',
	summaryTitleList: 'Lista tytułów',
};

describe('mountCategoriesForm', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('dodaje wiersz kategorii po kliknięciu przycisku', () => {
		document.body.innerHTML = `
			<form data-categories-form>
				<table>
					<tbody id="categories-body">
						<tr class="category-row-summary" data-category-entry="0">
							<td><span class="category-summary-name">Aktualności</span></td>
							<td><button type="button" class="remove-category">Usuń</button></td>
						</tr>
						<tr class="category-row-editor hidden" data-category-entry="0">
							<td colspan="2">
								<input name="category_slug" value="aktualnosci" />
								<input name="category_name" value="Aktualności" />
								<button type="button" class="close-category">Zamknij</button>
							</td>
						</tr>
					</tbody>
				</table>
				<button type="button" id="add-category">Dodaj</button>
			</form>
		`;

		mountCategoriesForm(labels);
		expect(document.querySelectorAll('.category-row-editor')).toHaveLength(1);
		document.getElementById('add-category')!.click();
		expect(document.querySelectorAll('.category-row-editor')).toHaveLength(2);
	});

	it('otwiera edycję nowej kategorii od razu po dodaniu', () => {
		document.body.innerHTML = `
			<form data-categories-form>
				<table>
					<tbody id="categories-body">
						<tr class="category-row-summary" data-category-entry="0">
							<td><span class="category-summary-name">Aktualności</span></td>
							<td><button type="button" class="edit-category">Edytuj</button></td>
						</tr>
						<tr class="category-row-editor hidden" data-category-entry="0">
							<td colspan="2">
								<input name="category_slug" value="aktualnosci" />
								<input name="category_name" value="Aktualności" />
								<button type="button" class="close-category">Zamknij</button>
							</td>
						</tr>
					</tbody>
				</table>
				<button type="button" id="add-category">Dodaj</button>
			</form>
		`;

		mountCategoriesForm(labels);
		document.getElementById('add-category')!.click();

		const editors = document.querySelectorAll('.category-row-editor');
		const newEditor = editors[1] as HTMLElement;
		expect(newEditor.classList.contains('hidden')).toBe(false);
	});

	it('podpowiada slug z nazwy, dopóki redaktor go nie zmieni', () => {
		document.body.innerHTML = `
			<form data-categories-form>
				<table>
					<tbody id="categories-body">
						<tr class="category-row-summary" data-category-entry="0">
							<td>
								<span class="category-summary-name">—</span>
								<span class="category-summary-slug">—</span>
							</td>
						</tr>
						<tr class="category-row-editor" data-category-entry="0">
							<td colspan="2">
								<input name="category_slug" value="" />
								<input name="category_name" value="" />
							</td>
						</tr>
					</tbody>
				</table>
			</form>
		`;

		mountCategoriesForm(labels);
		const name = document.querySelector('input[name="category_name"]') as HTMLInputElement;
		const slug = document.querySelector('input[name="category_slug"]') as HTMLInputElement;
		name.value = 'Mazowsze bez smogu';
		name.dispatchEvent(new Event('input', { bubbles: true }));
		expect(slug.value).toBe('mazowsze-bez-smogu');
	});
});
