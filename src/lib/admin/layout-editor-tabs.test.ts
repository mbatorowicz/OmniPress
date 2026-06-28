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
		expect(layoutTabHref('site-1', 'header')).toBe('/admin/units/site-1/layout/header');
	});

	it('sectionToDefaultTab mapuje sekcje zapisu', () => {
		expect(sectionToDefaultTab('navigation')).toBe('header');
		expect(sectionToDefaultTab('topbar')).toBe('header');
		expect(sectionToDefaultTab('categories')).toBe(DEFAULT_LAYOUT_TAB);
		expect(sectionToDefaultTab('components')).toBe('home');
		expect(sectionToDefaultTab('layout')).toBe(DEFAULT_LAYOUT_TAB);
	});

	it('resolveLayoutReturnTab preferuje return_tab', () => {
		expect(resolveLayoutReturnTab('components', 'footer')).toBe('footer');
		expect(resolveLayoutReturnTab('components', null)).toBe('home');
		expect(resolveLayoutReturnTab('navigation', 'header')).toBe('header');
	});

	it('isLayoutEditorTab waliduje tab', () => {
		expect(isLayoutEditorTab('header')).toBe(true);
		expect(isLayoutEditorTab('topbar')).toBe(false);
		expect(isLayoutEditorTab('menu')).toBe(false);
		expect(isLayoutEditorTab('categories')).toBe(false);
		expect(isLayoutEditorTab('invalid')).toBe(false);
	});
});

describe('buildLayoutEditorReturnUrl', () => {
	it('zwraca URL zakładki z return_tab', () => {
		expect(buildLayoutEditorReturnUrl('x', 'components', 'sidebar')).toBe(
			'/admin/units/x/components',
		);
		expect(buildLayoutEditorReturnUrl('x', 'home', 'sidebar')).toBe(
			'/admin/units/x/layout/sidebar',
		);
		expect(buildLayoutEditorReturnUrl('x', 'navigation')).toBe('/admin/units/x/layout/header');
		expect(buildLayoutEditorReturnUrl('x', 'categories')).toBe('/admin/units/x/posts');
		expect(buildLayoutEditorReturnUrl('x', 'topbar')).toBe('/admin/units/x/layout/header');
	});
});
