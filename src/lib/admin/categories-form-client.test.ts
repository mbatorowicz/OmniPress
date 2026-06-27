/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mountCategoriesForm } from '@/lib/admin/categories-form-client';

describe('mountCategoriesForm', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('dodaje wiersz kategorii po kliknięciu przycisku', () => {
		document.body.innerHTML = `
			<form data-categories-form>
				<table>
					<tbody id="categories-body">
						<tr class="category-row">
							<td><input name="category_slug" value="aktualnosci" /></td>
							<td><input name="category_name" value="Aktualności" /></td>
							<td><button type="button" class="remove-category">Usuń</button></td>
						</tr>
					</tbody>
				</table>
				<button type="button" id="add-category">Dodaj</button>
			</form>
		`;

		mountCategoriesForm({ remove: 'Usuń' });
		expect(document.querySelectorAll('.category-row')).toHaveLength(1);
		document.getElementById('add-category')!.click();
		expect(document.querySelectorAll('.category-row')).toHaveLength(2);
	});
});
