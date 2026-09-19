import { describe, expect, it } from 'vitest';
import type { CategoryOption } from '@/lib/categories';
import { applyEnrichment, enrichFallback } from './enrich-model';

const CATEGORIES: CategoryOption[] = [
	{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
	{ slug: 'zarzadzenia', name: 'Zarządzenia', sources: ['github_astro'] },
];

const FALLBACK = { title: 'Bez tytułu', contentMd: 'Proszę o publikację załącznika.' };

describe('applyEnrichment', () => {
	it('bierze tytuł i treść z załącznika, kategorię z allowlisty', () => {
		const draft = applyEnrichment(
			{
				title: '  Re: Festyn gminny  ',
				category_slug: 'AKTUALNOSCI',
				extra_category_slugs: ['zarzadzenia', 'AKTUALNOSCI', 'nie-ma'],
				content_md: 'Zapraszamy na festyn w sobotę.',
			},
			CATEGORIES,
			FALLBACK,
		);
		expect(draft.title).toBe('Festyn gminny');
		expect(draft.contentMd).toBe('Zapraszamy na festyn w sobotę.');
		expect(draft.categorySlug).toBe('aktualnosci');
		expect(draft.extraCategorySlugs).toEqual(['zarzadzenia']);
	});

	it('odrzuca nieznany slug i zły JSON — fallback', () => {
		expect(applyEnrichment({ title: 'A', category_slug: 'haker', content_md: 'Treść.' }, CATEGORIES, FALLBACK)).toMatchObject({
			title: 'A',
			categorySlug: null,
			extraCategorySlugs: [],
		});
		expect(applyEnrichment('nie json', CATEGORIES, FALLBACK)).toEqual(
			enrichFallback(FALLBACK.title, FALLBACK.contentMd),
		);
	});

	it('pusta treść modelu zostawia treść maila; emoji z tytułu zdejmowane', () => {
		const draft = applyEnrichment(
			{ title: '📅 Festyn', category_slug: null, content_md: '   ' },
			CATEGORIES,
			FALLBACK,
		);
		expect(draft.title).toBe('Festyn');
		expect(draft.contentMd).toBe(FALLBACK.contentMd);
		expect(draft.categorySlug).toBeNull();
	});
});
