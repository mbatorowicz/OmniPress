import { describe, expect, it } from 'vitest';
import { layoutTabLabel, layoutTabLead, layoutZoneTitles } from './layout-editor-i18n';
import { LAYOUT_EDITOR_TABS } from './layout-editor-tabs';

describe('layout-editor-i18n', () => {
	it('layoutTabLabel zwraca etykietę dla każdej zakładki', () => {
		for (const tab of LAYOUT_EDITOR_TABS) {
			expect(layoutTabLabel(tab).length).toBeGreaterThan(0);
		}
	});

	it('layoutTabLead zwraca opis dla każdej zakładki', () => {
		for (const tab of LAYOUT_EDITOR_TABS) {
			expect(layoutTabLead(tab).length).toBeGreaterThan(0);
		}
	});

	it('layoutZoneTitles zawiera wszystkie strefy edytora', () => {
		const titles = layoutZoneTitles();
		expect(titles.topbar).toBeTruthy();
		expect(titles.header).toBeTruthy();
		expect(titles.home).toBeTruthy();
		expect(titles.sidebar).toBeTruthy();
		expect(titles.footer).toBeTruthy();
		expect(titles.site).toBeTruthy();
	});
});
