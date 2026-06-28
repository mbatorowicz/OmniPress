import { describe, expect, it } from 'vitest';
import { buildLayoutEditorReturnUrl } from './layout-editor-context';
import {
	DEFAULT_LAYOUT_TAB,
	isLayoutEditorTab,
	layoutTabHref,
	resolveLayoutReturnTab,
	sectionToDefaultTab,
} from './layout-editor-tabs';

describe('layout-editor-tabs', () => {
	it('layoutTabHref buduje ścieżkę zakładki', () => {
		expect(layoutTabHref('site-1', 'menu')).toBe('/admin/units/site-1/layout/menu');
	});

	it('sectionToDefaultTab mapuje sekcje zapisu', () => {
		expect(sectionToDefaultTab('navigation')).toBe('menu');
		expect(sectionToDefaultTab('categories')).toBe('categories');
		expect(sectionToDefaultTab('components')).toBe('home');
		expect(sectionToDefaultTab('layout')).toBe(DEFAULT_LAYOUT_TAB);
		expect(sectionToDefaultTab('topbar')).toBe('topbar');
	});

	it('resolveLayoutReturnTab preferuje return_tab', () => {
		expect(resolveLayoutReturnTab('components', 'footer')).toBe('footer');
		expect(resolveLayoutReturnTab('components', null)).toBe('home');
		expect(resolveLayoutReturnTab('navigation', 'menu')).toBe('menu');
	});

	it('isLayoutEditorTab waliduje tab', () => {
		expect(isLayoutEditorTab('topbar')).toBe(true);
		expect(isLayoutEditorTab('invalid')).toBe(false);
	});
});

describe('buildLayoutEditorReturnUrl', () => {
	it('zwraca URL zakładki z return_tab', () => {
		expect(buildLayoutEditorReturnUrl('x', 'components', 'sidebar')).toBe(
			'/admin/units/x/layout/sidebar',
		);
		expect(buildLayoutEditorReturnUrl('x', 'navigation')).toBe('/admin/units/x/layout/menu');
		expect(buildLayoutEditorReturnUrl('x', 'topbar')).toBe('/admin/units/x/layout/topbar');
	});
});
