import { describe, expect, it } from 'vitest';
import { shouldAutoImportLayoutFromGitHub } from './layout-auto-import';
import { DEFAULT_LAYOUT_PATH, type SiteAstroLayout } from '@/lib/astro-layout/types';
import { emptyZones } from '@/lib/astro-layout/zones';
import { navigationHasLeafWithoutHref } from '@/lib/astro-layout/validate-nav';
import { hashLayoutFile } from '@/lib/astro-layout/layout-sync-meta.server';

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

const filledLayout: SiteAstroLayout = {
	...baseLayout,
	navigation: [{ label: 'Kontakt', href: '/kontakt' }],
	categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
	slots: [{ id: 'home_feed', label: 'Feed', component: 'home.latest' }],
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
				hashes: { draftHash: hashLayoutFile(baseLayout) },
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
				hashes: { draftHash: hashLayoutFile(layout) },
			}),
		).toBe(true);
	});

	it('importuje gdy strona zmieniła się po ostatniej publikacji z panelu', () => {
		const publishedHash = hashLayoutFile(filledLayout);
		const layout: SiteAstroLayout = {
			...filledLayout,
			sync: { publishedLayoutHash: publishedHash },
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 1,
				hashes: {
					draftHash: publishedHash,
					liveHash: 'other-live-hash',
					publishedHash,
				},
			}),
		).toBe(true);
	});

	it('nie importuje gdy szkic ma lokalne zmiany względem ostatniej publikacji', () => {
		const publishedHash = hashLayoutFile(filledLayout);
		const layout: SiteAstroLayout = {
			...filledLayout,
			navigation: [{ label: 'Edytowane', href: '/edit' }],
			sync: { publishedLayoutHash: publishedHash },
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 1,
				hashes: {
					draftHash: hashLayoutFile(layout),
					liveHash: 'other-live-hash',
					publishedHash,
				},
			}),
		).toBe(false);
	});

	it('nie importuje gdy szkic i strona są zgodne', () => {
		const hash = hashLayoutFile(filledLayout);
		const layout: SiteAstroLayout = {
			...filledLayout,
			sync: { publishedLayoutHash: hash },
		};
		expect(
			shouldAutoImportLayoutFromGitHub(layout, {
				draftHrefCount: 1,
				hashes: {
					draftHash: hash,
					liveHash: hash,
					publishedHash: hash,
				},
			}),
		).toBe(false);
	});
});
