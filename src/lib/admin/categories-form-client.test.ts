/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
	addToNewsFeed: 'Dodaj do feedu Aktualności',
	addToMenu: 'Dodaj do menu',
	remapConfirm: 'Zmiana slugu przepisze {n} wpisów.',
	removeConfirm: 'Usunąć kategorię? Wpisów: {n}.',
	lastCategory: 'Nie można usunąć ostatniej kategorii.',
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
		const added = document.querySelectorAll('.category-row-editor')[1] as HTMLElement;
		expect(added.querySelector('input[name="category_add_to_news_feed"]')).toBeTruthy();
		expect(added.querySelector<HTMLInputElement>('input[name="category_prev_slug"]')?.value).toBe('');
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
		expect(document.querySelector('.category-summary-slug')?.textContent).toBe(
			'/mazowsze-bez-smogu/',
		);
	});

	it('nie nadpisuje istniejącego slugu przy zmianie nazwy', () => {
		document.body.innerHTML = `
			<form data-categories-form>
				<table>
					<tbody id="categories-body">
						<tr class="category-row-summary" data-category-entry="0">
							<td>
								<span class="category-summary-name">Zarządzenia</span>
								<span class="category-summary-slug">/zarzadzenia/</span>
							</td>
						</tr>
						<tr class="category-row-editor" data-category-entry="0">
							<td colspan="2">
								<input name="category_slug" value="zarzadzenia" />
								<input name="category_name" value="Zarządzenia" />
							</td>
						</tr>
					</tbody>
				</table>
			</form>
		`;

		mountCategoriesForm(labels);
		const name = document.querySelector('input[name="category_name"]') as HTMLInputElement;
		const slug = document.querySelector('input[name="category_slug"]') as HTMLInputElement;
		name.value = 'Ogłoszenia';
		name.dispatchEvent(new Event('input', { bubbles: true }));
		expect(slug.value).toBe('zarzadzenia');
	});

	it('normalizuje ręczny slug po opuszczeniu pola i pokazuje podgląd URL', () => {
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
		const slug = document.querySelector('input[name="category_slug"]') as HTMLInputElement;
		slug.value = 'Zarządzenia';
		slug.dispatchEvent(new Event('input', { bubbles: true }));
		expect(document.querySelector('.category-summary-slug')?.textContent).toBe('/zarzadzenia/');
		slug.dispatchEvent(new Event('blur', { bubbles: true }));
		expect(slug.value).toBe('zarzadzenia');
	});

	it('pokazuje komunikat zamiast cichego no-op przy ostatniej kategorii', () => {
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
								<input name="category_prev_slug" value="aktualnosci" />
								<input name="category_slug" value="aktualnosci" />
							</td>
						</tr>
					</tbody>
				</table>
				<p class="hidden" data-categories-last-msg hidden></p>
			</form>
		`;

		mountCategoriesForm(labels);
		document.querySelector('.remove-category')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(document.querySelectorAll('.category-row-editor')).toHaveLength(1);
		const msg = document.querySelector('[data-categories-last-msg]') as HTMLElement;
		expect(msg.hidden).toBe(false);
		expect(msg.classList.contains('hidden')).toBe(false);
		expect(msg.textContent).toBe(labels.lastCategory);
	});

	it('pyta o potwierdzenie i podaje liczbę wpisów przed usunięciem', () => {
		document.body.innerHTML = `
			<form data-categories-form data-post-counts='{"odpady":4}'>
				<table>
					<tbody id="categories-body">
						<tr class="category-row-summary" data-category-entry="0">
							<td><button type="button" class="remove-category">Usuń</button></td>
						</tr>
						<tr class="category-row-editor" data-category-entry="0">
							<td>
								<input name="category_prev_slug" value="odpady" />
								<input name="category_slug" value="odpady" />
							</td>
						</tr>
						<tr class="category-row-summary" data-category-entry="1">
							<td><button type="button" class="remove-category">Usuń</button></td>
						</tr>
						<tr class="category-row-editor" data-category-entry="1">
							<td>
								<input name="category_prev_slug" value="aktualnosci" />
								<input name="category_slug" value="aktualnosci" />
							</td>
						</tr>
					</tbody>
				</table>
			</form>
		`;

		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		mountCategoriesForm(labels);
		document.querySelector('.remove-category')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(confirmSpy).toHaveBeenCalledWith('Usunąć kategorię? Wpisów: 4.');
		expect(document.querySelectorAll('.category-row-editor')).toHaveLength(2);

		confirmSpy.mockReturnValue(true);
		document.querySelector('.remove-category')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(document.querySelectorAll('.category-row-editor')).toHaveLength(1);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});
