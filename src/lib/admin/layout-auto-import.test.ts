import { describe, expect, it } from 'vitest';
import { shouldAutoImportLayoutFromGitHub } from './layout-auto-import';
import { DEFAULT_LAYOUT_PATH, type SiteAstroLayout } from '@/lib/astro-layout/types';
import { emptyZones } from '@/lib/astro-layout/zones';
import { navigationHasLeafWithoutHref } from '@/lib/astro-layout/validate-nav';
import {
	hashCategoriesLayout,
	hashNavigationLayout,
} from '@/lib/astro-layout/layout-sync-meta.server';

const baseLayout: SiteAstroLayout = {
	navigation: [],
	categories: [],
	categoryDisplays: {},
	zones: emptyZones(),
	slots: [],
	layoutPath: DEFAULT_LAYOUT_PATH,
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
			shouldAutoImportLayoutFromGitHub(baseLayout, {
				draftHrefCount: 0,
				hashes: {
					draftNavHash: hashNavigationLayout(baseLayout.navigation),
					draftCategoriesHash: hashCategoriesLayout(baseLayout),
				},
			}),
		).toBe(true);
	});

	it('importuje uszkodzone menu bez linków', () => {
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation: [{ label: 'Gmina', children: [{ label: 'Plan ogólny' }] }],
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 0,
				hashes: {
					draftNavHash: hashNavigationLayout(layout.navigation),
					draftCategoriesHash: hashCategoriesLayout(layout),
				},
			}),
		).toBe(true);
	});

	it('importuje gdy live rozni sie od szkicu bez lokalnych zmian', () => {
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation: [{ label: 'Kontakt', href: '/kontakt' }],
			sync: { publishedNavHash: hashNavigationLayout([{ label: 'Kontakt', href: '/kontakt' }]) },
		};
		const liveNav = hashNavigationLayout([
			{
				label: 'Kontakt',
				href: '/kontakt',
				menuColumns: 2,
				menuColumnWidths: ['320px', '320px'],
				children: [{ label: 'Pod', href: '/pod' }],
			},
		]);
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 1,
				hashes: {
					draftNavHash: hashNavigationLayout(layout.navigation),
					draftCategoriesHash: hashCategoriesLayout(layout),
					liveNavHash: liveNav,
					publishedNavHash: layout.sync?.publishedNavHash,
				},
			}),
		).toBe(true);
	});

	it('nie importuje gdy szkic ma lokalne zmiany wzgledem ostatniego znanego stanu', () => {
		const publishedNav = hashNavigationLayout([{ label: 'Kontakt', href: '/kontakt' }]);
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation: [{ label: 'Edytowane', href: '/edit' }],
			sync: { publishedNavHash: publishedNav },
		};
		const liveNav = hashNavigationLayout([{ label: 'Kontakt', href: '/kontakt' }]);
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 1,
				hashes: {
					draftNavHash: hashNavigationLayout(layout.navigation),
					draftCategoriesHash: hashCategoriesLayout(layout),
					liveNavHash: liveNav,
					publishedNavHash: publishedNav,
				},
			}),
		).toBe(false);
	});

	it('nie importuje gdy szkic i live sa zgodne', () => {
		const navigation = [{ label: 'Kontakt', href: '/kontakt' }];
		const layout: SiteAstroLayout = {
			...baseLayout,
			navigation,
			sync: { publishedNavHash: hashNavigationLayout(navigation) },
		};
		const liveNav = hashNavigationLayout(navigation);
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 1,
				hashes: {
					draftNavHash: liveNav,
					draftCategoriesHash: hashCategoriesLayout(layout),
					liveNavHash: liveNav,
					publishedNavHash: liveNav,
				},
			}),
		).toBe(false);
	});
});
