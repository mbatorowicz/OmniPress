/** Układ dropdownu (liczba kolumn, szerokości) — tylko pozycje głównego poziomu go mają. */
import { resolveNavDropdownLayout } from '@/lib/admin/nav-dropdown-layout';

export function readDropdownLayoutFromRow(row: HTMLElement) {
	const columnsSelect = row.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const width0 = row.querySelector('.nav-menu-col-width-0') as HTMLInputElement | null;
	const width1 = row.querySelector('.nav-menu-col-width-1') as HTMLInputElement | null;
	const columns = columnsSelect?.value === '2' ? 2 : 1;
	const columnWidths = [width0?.value.trim(), width1?.value.trim()].filter(
		(value): value is string => Boolean(value),
	);
	return resolveNavDropdownLayout({ menuColumns: columns, menuColumnWidths: columnWidths });
}

export function syncDropdownLayoutSubmit(row: HTMLElement): void {
	const columnsSubmit = row.querySelector('.nav-menu-columns-submit') as HTMLInputElement | null;
	const width0Submit = row.querySelector('.nav-menu-col-width-0-submit') as HTMLInputElement | null;
	const width1Submit = row.querySelector('.nav-menu-col-width-1-submit') as HTMLInputElement | null;
	const columnsSelect = row.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const width0 = row.querySelector('.nav-menu-col-width-0') as HTMLInputElement | null;
	const width1 = row.querySelector('.nav-menu-col-width-1') as HTMLInputElement | null;
	if (!columnsSubmit) return;

	const columns = columnsSelect?.value === '2' ? '2' : '1';
	columnsSubmit.value = columns;
	if (width0Submit) width0Submit.value = width0?.value.trim() ?? '';
	if (width1Submit) width1Submit.value = columns === '2' ? (width1?.value.trim() ?? '') : '';
}

export function syncDropdownLayoutCell(row: HTMLElement): void {
	const depthSelect = row.querySelector('.nav-depth') as HTMLSelectElement | null;
	const cell = row.querySelector('.nav-dropdown-layout-cell');
	const columnsSelect = row.querySelector('.nav-menu-columns') as HTMLSelectElement | null;
	const width1Field = row.querySelector('.nav-menu-col-width-1-field');
	if (!depthSelect || !cell) return;

	const isMain = depthSelect.value === '0';
	cell.classList.toggle('hidden', !isMain);

	if (columnsSelect) columnsSelect.disabled = !isMain;
	for (const input of row.querySelectorAll('.nav-menu-col-width-0, .nav-menu-col-width-1')) {
		if (input instanceof HTMLInputElement) input.disabled = !isMain;
	}

	if (!isMain) {
		const columnsSubmit = row.querySelector('.nav-menu-columns-submit') as HTMLInputElement | null;
		const width0Submit = row.querySelector('.nav-menu-col-width-0-submit') as HTMLInputElement | null;
		const width1Submit = row.querySelector('.nav-menu-col-width-1-submit') as HTMLInputElement | null;
		if (columnsSubmit) columnsSubmit.value = '1';
		if (width0Submit) width0Submit.value = '';
		if (width1Submit) width1Submit.value = '';
		return;
	}

	const twoColumns = columnsSelect?.value === '2';
	width1Field?.classList.toggle('hidden', !twoColumns);
	const width1Input = row.querySelector('.nav-menu-col-width-1') as HTMLInputElement | null;
	if (width1Input) width1Input.disabled = !twoColumns;

	syncDropdownLayoutSubmit(row);
}

export function bindDropdownLayoutInputs(row: HTMLElement): void {
	const cell = row.querySelector('.nav-dropdown-layout-cell');
	if (!(cell instanceof HTMLElement) || cell.dataset.dropdownLayoutBound === '1') return;
	cell.dataset.dropdownLayoutBound = '1';

	const columnsSelect = row.querySelector('.nav-menu-columns');
	columnsSelect?.addEventListener('change', () => {
		syncDropdownLayoutCell(row);
	});

	for (const input of row.querySelectorAll('.nav-menu-col-width-0, .nav-menu-col-width-1')) {
		input.addEventListener('input', () => syncDropdownLayoutSubmit(row));
	}
}
