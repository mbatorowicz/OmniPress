import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withPublishedMeta } from '@/lib/astro-layout/layout-sync-meta.server';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import { createSupabaseFake } from '@/lib/testing/supabase-fake';

const loadSiteAstroLayout = vi.hoisted(() => vi.fn());
const loadSiteAstroDestination = vi.hoisted(() => vi.fn());
const fetchAstroCategories = vi.hoisted(() => vi.fn());

vi.mock('@/lib/astro-layout/store', () => ({ loadSiteAstroLayout }));
vi.mock('@/lib/admin/sites', () => ({ loadSiteAstroDestination }));
vi.mock('./astro-github', () => ({ fetchAstroCategories }));

const { loadPublishedSiteCategories } = await import('./published');

function publishedLayout() {
	return withPublishedMeta(
		{
			...emptySiteAstroLayout(),
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		},
		{ commitSha: 'abc1234', scope: 'layout' },
	);
}

beforeEach(() => {
	loadSiteAstroLayout.mockReset();
	loadSiteAstroDestination.mockReset();
	fetchAstroCategories.mockReset();
});

describe('loadPublishedSiteCategories', () => {
	it('przy zsynchronizowanym layoucie nie woła GitHub i pomija szkic', async () => {
		loadSiteAstroLayout.mockResolvedValue(publishedLayout());
		const fake = createSupabaseFake();

		const result = await loadPublishedSiteCategories(fake.client, 'site-1');

		expect(result.categories.map((c) => c.slug)).toEqual(['aktualnosci']);
		expect(fetchAstroCategories).not.toHaveBeenCalled();
		expect(loadSiteAstroDestination).not.toHaveBeenCalled();
	});

	it('szkic nowej kategorii nie wchodzi na listę — bierze kopię z GitHub', async () => {
		const published = publishedLayout();
		loadSiteAstroLayout.mockResolvedValue({
			...published,
			categories: [...published.categories, { slug: 'szkic', name: 'Szkic' }],
		});
		loadSiteAstroDestination.mockResolvedValue({ name: 'gmina-miedzna' });
		fetchAstroCategories.mockResolvedValue([
			{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
		]);
		const fake = createSupabaseFake();

		const result = await loadPublishedSiteCategories(fake.client, 'site-1');

		expect(result.categories.map((c) => c.slug)).toEqual(['aktualnosci']);
		expect(result.categories.some((c) => c.slug === 'szkic')).toBe(false);
		expect(fetchAstroCategories).toHaveBeenCalledOnce();
	});

	it('błąd GitHub nie wraca do szkicu — pusta lista i ostrzeżenie', async () => {
		loadSiteAstroLayout.mockResolvedValue({
			...emptySiteAstroLayout(),
			categories: [{ slug: 'szkic', name: 'Szkic' }],
		});
		loadSiteAstroDestination.mockResolvedValue({ name: 'gmina-miedzna' });
		fetchAstroCategories.mockRejectedValue(new Error('timeout'));
		const fake = createSupabaseFake();

		const result = await loadPublishedSiteCategories(fake.client, 'site-1');

		expect(result.categories).toEqual([]);
		expect(result.warnings[0]).toContain('gmina-miedzna');
		expect(result.warnings[0]).toContain('timeout');
	});
});
