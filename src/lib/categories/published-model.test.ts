import { describe, expect, it } from 'vitest';
import { hashLayoutFile, withPublishedMeta } from '@/lib/astro-layout/layout-sync-meta.server';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import {
	categoriesFromLayout,
	isLayoutInPublishedSync,
	publishedCategorySlugs,
} from './published-model';

function layoutWithCategories(
	categories: { slug: string; name: string }[],
	published = false,
) {
	const layout = { ...emptySiteAstroLayout(), categories };
	if (!published) return layout;
	return withPublishedMeta(layout, { commitSha: 'abc1234', scope: 'layout' });
}

describe('isLayoutInPublishedSync', () => {
	it('true gdy hash szkicu = ostatnia publikacja', () => {
		const layout = layoutWithCategories([{ slug: 'aktualnosci', name: 'Aktualności' }], true);
		expect(isLayoutInPublishedSync(layout)).toBe(true);
		expect(layout.sync?.publishedLayoutHash).toBe(hashLayoutFile(layout));
	});

	it('false gdy w szkicu jest nowa kategoria', () => {
		const published = layoutWithCategories([{ slug: 'aktualnosci', name: 'Aktualności' }], true);
		const draft = {
			...published,
			categories: [...published.categories, { slug: 'szkic', name: 'Szkic' }],
		};
		expect(isLayoutInPublishedSync(draft)).toBe(false);
	});

	it('false gdy layout nigdy nie był publikowany', () => {
		const layout = layoutWithCategories([{ slug: 'aktualnosci', name: 'Aktualności' }]);
		expect(isLayoutInPublishedSync(layout)).toBe(false);
	});
});

describe('categoriesFromLayout', () => {
	it('pomija puste wiersze i sortuje po nazwie', () => {
		const result = categoriesFromLayout({
			categories: [
				{ slug: 'zarzadzenia', name: 'Zarządzenia' },
				{ slug: '', name: 'Puste' },
				{ slug: 'aktualnosci', name: 'Aktualności' },
			],
		});
		expect(result.map((c) => c.slug)).toEqual(['aktualnosci', 'zarzadzenia']);
	});
});

describe('publishedCategorySlugs', () => {
	it('normalizuje do małych liter', () => {
		expect(publishedCategorySlugs([{ slug: 'Aktualnosci' }]).has('aktualnosci')).toBe(true);
	});
});
