import { describe, expect, it } from 'vitest';
import {
	applyNavDropdownFieldsFromForm,
	resolveNavDropdownLayout,
	resolveNavMenuColumns,
	sanitizeNavMenuColumnWidth,
} from './nav-dropdown-layout';
import type { NavItem } from '@/lib/astro-layout/types';

describe('nav-dropdown-layout', () => {
	it('migruje isMegaMenu do 2 kolumn', () => {
		expect(resolveNavMenuColumns({ isMegaMenu: true })).toBe(2);
		expect(resolveNavDropdownLayout({ isMegaMenu: true }).columns).toBe(2);
	});

	it('bez menuColumnWidths nie wstawia domyślnych px', () => {
		const layout = resolveNavDropdownLayout({});
		expect(layout.columns).toBe(1);
		expect(layout.columnWidths).toEqual([]);
	});

	it('sanitizeNavMenuColumnWidth akceptuje px, fr i %', () => {
		expect(sanitizeNavMenuColumnWidth('320px')).toBe('320px');
		expect(sanitizeNavMenuColumnWidth('1fr')).toBe('1fr');
		expect(sanitizeNavMenuColumnWidth('50%')).toBe('50%');
		expect(sanitizeNavMenuColumnWidth('bad;')).toBeUndefined();
	});

	it('applyNavDropdownFieldsFromForm zapisuje tylko podane szerokości', () => {
		const item: NavItem = { label: 'Gmina' };
		applyNavDropdownFieldsFromForm(item, '2', '1fr', '1fr');
		expect(item.menuColumns).toBe(2);
		expect(item.menuColumnWidths).toEqual(['1fr', '1fr']);
		expect(item.isMegaMenu).toBeUndefined();
	});

	it('resolveNavMenuColumns akceptuje string "2"', () => {
		expect(resolveNavMenuColumns({ menuColumns: '2' as unknown as 2 })).toBe(2);
	});
});
