import { describe, expect, it, vi } from 'vitest';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import { createSupabaseFake } from '@/lib/testing/supabase-fake';

const loadSiteAstroLayout = vi.hoisted(() => vi.fn());
vi.mock('@/lib/astro-layout/store', () => ({ loadSiteAstroLayout }));

const { loadDraftSiteCategories } = await import('./site');

describe('loadDraftSiteCategories', () => {
	it('zwraca kategorie ze szkicu layoutu, także nieopublikowane', async () => {
		loadSiteAstroLayout.mockResolvedValue({
			...emptySiteAstroLayout(),
			categories: [
				{ slug: 'aktualnosci', name: 'Aktualności' },
				{ slug: 'szkic', name: 'Szkic' },
			],
		});
		const fake = createSupabaseFake();
		const result = await loadDraftSiteCategories(fake.client, 'site-1');
		expect(result.categories.map((c) => c.slug)).toEqual(['aktualnosci', 'szkic']);
	});
});
