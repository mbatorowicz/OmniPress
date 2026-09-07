import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake } from '@/lib/testing/supabase-fake';

const loadPublishedSiteCategories = vi.hoisted(() => vi.fn());

vi.mock('@/lib/categories', () => ({
	findCategoryBySlug: (categories: { slug: string; name: string }[], slug: string) => {
		const key = slug.trim().toLowerCase();
		return categories.find((c) => c.slug.toLowerCase() === key) ?? null;
	},
	loadPublishedSiteCategories,
}));

const { resolvePostCategoryFields } = await import('./category');

beforeEach(() => {
	loadPublishedSiteCategories.mockReset();
	loadPublishedSiteCategories.mockResolvedValue({
		categories: [
			{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
			{ slug: 'zarzadzenia', name: 'Zarządzenia', sources: ['github_astro'] },
		],
		warnings: [],
	});
});

describe('resolvePostCategoryFields', () => {
	it('przyjmuje kategorię z opublikowanej listy', async () => {
		const fake = createSupabaseFake();
		const result = await resolvePostCategoryFields(
			fake.client,
			'site-1',
			'aktualnosci',
			['zarzadzenia'],
		);

		expect(result).toEqual({
			category_slug: 'aktualnosci',
			category_name: 'Aktualności',
			extra_category_slugs: ['zarzadzenia'],
		});
	});

	it('szkic nowej kategorii nie przechodzi — redaktor jej nie wyśle', async () => {
		const fake = createSupabaseFake();
		const result = await resolvePostCategoryFields(fake.client, 'site-1', 'szkic');
		expect(result).toBeNull();
	});

	it('osierocony slug (usunięta / przemianowana) → null', async () => {
		const fake = createSupabaseFake();
		expect(await resolvePostCategoryFields(fake.client, 'site-1', 'informacje')).toBeNull();
	});
});
