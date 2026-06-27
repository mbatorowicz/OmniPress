/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mountNavigationForm, type NavigationTableLabels } from '@/lib/admin/navigation-form-client';
import type { NavTargetOptions } from '@/lib/admin/nav-target-options';

const navTargetOptions: NavTargetOptions = {
	category: [{ value: 'zarzadzenia', label: 'Zarządzenia' }],
	page: [{ value: '/gmina/urzad', label: 'Urząd & Gminy' }],
	static: [{ value: '/', label: 'Start' }],
	emptyCategory: 'Brak kategorii',
	emptyPage: 'Brak stron',
};

const labels: NavigationTableLabels = {
	remove: 'Usuń',
	depth0: 'Poziom 1',
	depth1: 'Poziom 2',
	depth2: 'Poziom 3',
	megaHint: 'Mega',
	hrefKinds: {
		none: 'Bez linku',
		category: 'Kategoria wpisów',
		page: 'Strona z menu / CMS',
		static: 'Stała trasa',
		custom: 'Własny URL',
		external: 'Adres zewnętrzny',
	},
};

function buildNavigationTable(pageValue: string): void {
	const optionsJson = JSON.stringify(navTargetOptions);
	document.body.innerHTML = `
		<form>
			<script id="nav-target-options-json" type="application/json">${optionsJson}</script>
			<table id="navigation-table">
				<tbody id="navigation-body">
					<tr class="nav-row ui-table-dense-row nav-row--depth-0" data-nav-kind="page" data-nav-href="${pageValue}">
						<td>
							<select name="nav_depth" class="nav-depth">
								<option value="0" selected>Poziom 1</option>
							</select>
						</td>
						<td><input name="nav_label" value="Test" /></td>
						<td>
							<input type="hidden" name="nav_href_kind" class="nav-href-kind-submit" value="page" />
							<select class="nav-href-kind">
								<option value="none">Bez linku</option>
								<option value="category">Kategoria wpisów</option>
								<option value="page" selected>Strona z menu / CMS</option>
								<option value="static">Stała trasa</option>
								<option value="custom">Własny URL</option>
								<option value="external">Adres zewnętrzny</option>
							</select>
						</td>
						<td class="nav-href-values">
							<input type="hidden" name="nav_href_value" class="nav-href-value-submit" value="${pageValue}" />
							<div class="nav-href-target-host">
								<select class="nav-href-target-control">
									<option value="/gmina/urzad" selected>Urząd Gminy</option>
								</select>
							</div>
						</td>
						<td class="nav-mega-cell">
							<input type="checkbox" class="nav-mega" name="nav_is_mega" />
						</td>
						<td><button type="button" class="remove-nav-row">Usuń</button></td>
					</tr>
				</tbody>
			</table>
		</form>
	`;
}

describe('mountNavigationForm', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('czyta opcje celu ze script#nav-target-options-json', () => {
		buildNavigationTable('/gmina/urzad');
		mountNavigationForm(labels);

		const form = document.querySelector('form');
		expect(form?.dataset.navigationFormBound).toBe('1');
	});

	it('po zmianie typu na category podmienia opcje celu na kategorie', () => {
		buildNavigationTable('/gmina/urzad');
		mountNavigationForm(labels);

		const kindSelect = document.querySelector('.nav-href-kind') as HTMLSelectElement;
		kindSelect.value = 'category';
		kindSelect.dispatchEvent(new Event('change', { bubbles: true }));

		const target = document.querySelector('.nav-href-target-control') as HTMLSelectElement;
		const values = [...target.options].map((o) => o.value);
		expect(values).toEqual(['zarzadzenia']);
		expect(values).not.toContain('/gmina/urzad');
	});

	it('przy init przebudowuje cel zgodnie z typem wiersza', () => {
		buildNavigationTable('/gmina/urzad');
		mountNavigationForm(labels);

		const target = document.querySelector('.nav-href-target-control') as HTMLSelectElement;
		const values = [...target.options].map((o) => o.value);
		expect(values).toEqual(['/gmina/urzad']);
	});

	it('obsługuje ampersand w tytułach stron w JSON opcji', () => {
		buildNavigationTable('/gmina/urzad');
		mountNavigationForm(labels);

		const script = document.getElementById('nav-target-options-json');
		expect(script?.textContent).toContain('Urząd & Gminy');

		const kindSelect = document.querySelector('.nav-href-kind') as HTMLSelectElement;
		kindSelect.value = 'static';
		kindSelect.dispatchEvent(new Event('change', { bubbles: true }));

		const target = document.querySelector('.nav-href-target-control') as HTMLSelectElement;
		expect([...target.options].map((o) => o.value)).toEqual(['/']);
	});

	it('dodaje wiersz po kliknięciu przycisku poza tbody', () => {
		buildNavigationTable('/gmina/urzad');
		document.querySelector('form')!.insertAdjacentHTML(
			'beforeend',
			'<button type="button" id="add-nav-row">Dodaj</button>',
		);
		mountNavigationForm(labels);

		expect(document.querySelectorAll('.nav-row')).toHaveLength(1);
		document.getElementById('add-nav-row')!.click();
		expect(document.querySelectorAll('.nav-row')).toHaveLength(2);
	});
});
