import { describe, expect, it } from 'vitest';
import { shouldAutoImportLayoutFromGitHub } from './layout-auto-import';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import { navigationHasLeafWithoutHref } from '@/lib/astro-layout/validate-nav';

const baseLayout: SiteAstroLayout = {
	navigation: [],
	categories: [],
	categoryDisplays: {},
	slots: [],
	navigationPath: 'src/config/omnipress-navigation.json',
	categoriesPath: 'src/config/omnipress-categories.json',
};

describe('navigationHasLeafWithoutHref', () => {
	it('wykrywa liść bez href', () => {
		expect(
			navigationHasLeafWithoutHref([{ label: 'Grupa', children: [{ label: 'Liść' }] }]),
		).toBe(true);
	});

	it('ignoruje grupę z poprawnym liściem', () => {
		expect(
			navigationHasLeafWithoutHref([
				{ label: 'Grupa', children: [{ label: 'Liść', href: '/x' }] },
			]),
		).toBe(false);
	});
});

describe('shouldAutoImportLayoutFromGitHub', () => {
	it('importuje pusty layout', () => {
		expect(
			shouldAutoImportLayoutFromGitHub(baseLayout, { draftHrefCount: 0, liveHrefCount: null }),
		).toBe(true);
	});

	it('importuje uszkodzone menu bez linków gdy live ma hrefy', () => {
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation: [{ label: 'Gmina', children: [{ label: 'Plan ogólny' }] }],
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, { draftHrefCount: 0, liveHrefCount: 35 }),
		).toBe(true);
	});

	it('importuje gdy live ma wiecej linkow niz szkic', () => {
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation: [{ label: 'Kontakt', href: '/kontakt' }],
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, { draftHrefCount: 1, liveHrefCount: 35 }),
		).toBe(true);
	});

	it('nie importuje gdy szkic ma linki i live nie ma wiecej', () => {
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation: [{ label: 'Kontakt', href: '/kontakt' }],
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, { draftHrefCount: 1, liveHrefCount: 1 }),
		).toBe(false);
	});
});
