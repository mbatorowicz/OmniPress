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
	edit: 'Edytuj',
	closeEdit: 'Zamknij',
	depth0: 'Poziom 1',
	depth1: 'Poziom 2',
	depth2: 'Poziom 3',
	menuColumnOne: '1 kolumna',
	menuColumnTwo: '2 kolumny',
	menuColumnsHint: '',
	addNavChild: '+ Dodaj podpozycję',
	navParentRoot: '—',
	navParentMissing: 'Brak pozycji nadrzędnej',
	navParentPrefix: 'pod:',
	hrefKinds: {
		none: 'Bez linku',
		category: 'Kategoria wpisów',
		page: 'Strona z menu / CMS',
		static: 'Stała trasa',
		custom: 'Własny URL',
		external: 'Adres zewnętrzny',
	},
	fieldLabels: {
		navDepth: 'Poziom',
		navParent: 'Pozycja nadrzędna',
		navLabel: 'Etykieta',
		navLinkType: 'Typ linku',
		navLinkTarget: 'Adres / cel',
		navMenuColumns: 'Układ dropdownu',
		navMenuColumnWidth1: 'Szerokość kolumny 1',
		navMenuColumnWidth2: 'Szerokość kolumny 2',
	},
};

function buildNavigationList(pageValue: string, menuColumns = '1'): void {
	const optionsJson = JSON.stringify(navTargetOptions);
	document.body.innerHTML = `
		<form>
			<script id="nav-target-options-json" type="application/json">${optionsJson}</script>
			<div id="navigation-body" class="nav-tile-list">
				<div class="nav-entry nav-row--depth-0" data-nav-entry="0">
					<div class="nav-tile nav-row-summary">
						<div class="nav-tile-main">
							<span class="nav-summary-label">Gmina</span>
							<span class="nav-summary-sep">·</span>
							<span class="nav-summary-link-text">Strona</span>
							<span class="nav-summary-layout">2 kolumny</span>
						</div>
						<div class="nav-tile-actions">
							<button type="button" class="edit-nav-row">Edytuj</button>
							<button type="button" class="add-nav-child">Dodaj podpozycję</button>
							<button type="button" class="remove-nav-row">Usuń</button>
						</div>
					</div>
					<div class="nav-row-editor hidden" data-nav-kind="page" data-nav-href="${pageValue}">
						<div class="nav-row-editor-panel">
							<select name="nav_depth" class="nav-depth">
								<option value="0" selected>Poziom 1</option>
							</select>
							<div class="nav-parent-cell">
								<input type="hidden" name="nav_parent" value="" />
							</div>
							<input name="nav_label" value="Gmina" />
							<input type="hidden" name="nav_href_kind" class="nav-href-kind-submit" value="page" />
							<select class="nav-href-kind">
								<option value="none">Bez linku</option>
								<option value="category">Kategoria wpisów</option>
								<option value="page" selected>Strona z menu / CMS</option>
								<option value="static">Stała trasa</option>
								<option value="custom">Własny URL</option>
								<option value="external">Adres zewnętrzny</option>
							</select>
							<div class="nav-href-values">
								<input type="hidden" name="nav_href_value" class="nav-href-value-submit" value="${pageValue}" />
								<div class="nav-href-target-host">
									<select class="nav-href-target-control">
										<option value="/gmina/urzad" selected>Urząd Gminy</option>
									</select>
								</div>
							</div>
							<div class="nav-dropdown-layout-cell">
								<input type="hidden" name="nav_menu_columns" class="nav-menu-columns-submit" value="${menuColumns}" />
								<input type="hidden" name="nav_menu_col_width_0" class="nav-menu-col-width-0-submit" value="" />
								<input type="hidden" name="nav_menu_col_width_1" class="nav-menu-col-width-1-submit" value="" />
								<select class="nav-menu-columns" data-initial-columns="${menuColumns}">
									<option value="1">1 kolumna</option>
									<option value="2">2 kolumny</option>
								</select>
								<input type="text" class="nav-menu-col-width-0" />
								<input type="text" class="nav-menu-col-width-1" />
							</div>
							<button type="button" class="close-nav-row">Zamknij</button>
						</div>
					</div>
				</div>
			</div>
			<button type="button" id="add-nav-row">Dodaj</button>
		</form>
	`;
}

describe('mountNavigationForm', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('czyta opcje celu ze script#nav-target-options-json', () => {
		buildNavigationList('/gmina/urzad');
		mountNavigationForm(labels);

		const form = document.querySelector('form');
		expect(form?.dataset.navigationFormBound).toBe('1');
	});

	it('po zmianie typu na category podmienia opcje celu na kategorie', () => {
		buildNavigationList('/gmina/urzad');
		mountNavigationForm(labels);

		document.querySelector('.edit-nav-row')!.dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		);

		const kindSelect = document.querySelector('.nav-href-kind') as HTMLSelectElement;
		kindSelect.value = 'category';
		kindSelect.dispatchEvent(new Event('change', { bubbles: true }));

		const target = document.querySelector('.nav-href-target-control') as HTMLSelectElement;
		const values = [...target.options].map((o) => o.value);
		expect(values).toEqual(['zarzadzenia']);
		expect(values).not.toContain('/gmina/urzad');
	});

	it('dodaje wiersz poziomu 0 po kliknięciu przycisku poza listą', () => {
		buildNavigationList('/gmina/urzad');
		mountNavigationForm(labels);

		expect(document.querySelectorAll('.nav-entry')).toHaveLength(1);
		document.getElementById('add-nav-row')!.click();
		expect(document.querySelectorAll('.nav-entry')).toHaveLength(2);
	});

	it('dodaje podpozycję z poziomem 1 i pozycją nadrzędną', () => {
		buildNavigationList('/gmina/urzad');
		mountNavigationForm(labels);

		document.querySelector('.add-nav-child')!.dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		);

		expect(document.querySelectorAll('.nav-entry')).toHaveLength(2);
		const childEditor = document.querySelectorAll('.nav-row-editor')[1] as HTMLElement;
		expect((childEditor.querySelector('.nav-depth') as HTMLSelectElement).value).toBe('1');
		expect((childEditor.querySelector('.nav-parent') as HTMLSelectElement).value).toBe('0');
	});

	it('otwiera edycję po kliknięciu Edytuj i zamyka po Zamknij', () => {
		buildNavigationList('/gmina/urzad');
		mountNavigationForm(labels);

		const editor = document.querySelector('.nav-row-editor') as HTMLElement;
		expect(editor.classList.contains('hidden')).toBe(true);

		document.querySelector('.edit-nav-row')!.dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		);
		expect(editor.classList.contains('hidden')).toBe(false);

		document.querySelector('.close-nav-row')!.dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		);
		expect(editor.classList.contains('hidden')).toBe(true);
	});

	it('po mount zachowuje 2 kolumny w podsumowaniu gdy data-initial-columns=2', () => {
		buildNavigationList('/gmina/urzad', '2');
		mountNavigationForm(labels);

		const layoutSummary = document.querySelector('.nav-summary-layout');
		expect(layoutSummary?.textContent).toBe('2 kolumny');
		const columnsSubmit = document.querySelector('.nav-menu-columns-submit') as HTMLInputElement;
		expect(columnsSubmit.value).toBe('2');
	});
});
