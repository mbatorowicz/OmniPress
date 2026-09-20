import { describe, expect, it } from 'vitest';
import type { CategoryOption } from '@/lib/categories';
import { applyEnrichment, enrichFallback, isSameEnrichDraft } from './enrich-model';

const CATEGORIES: CategoryOption[] = [
	{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
	{ slug: 'zarzadzenia', name: 'Zarządzenia', sources: ['github_astro'] },
];

const FALLBACK = { title: 'Bez tytułu', contentMd: 'Proszę o publikację załącznika.' };

describe('applyEnrichment', () => {
	it('bierze tytuł i treść z załącznika, kategorię z allowlisty', () => {
		const [draft] = applyEnrichment(
			{
				title: '  Re: Festyn gminny  ',
				category_slug: 'AKTUALNOSCI',
				extra_category_slugs: ['zarzadzenia', 'AKTUALNOSCI', 'nie-ma'],
				content_md: 'Zapraszamy na festyn w sobotę.',
			},
			CATEGORIES,
			FALLBACK,
		);
		expect(draft).toMatchObject({
			title: 'Festyn gminny',
			contentMd: 'Zapraszamy na festyn w sobotę.',
			categorySlug: 'aktualnosci',
			extraCategorySlugs: ['zarzadzenia'],
		});
	});

	it('odrzuca nieznany slug i zły JSON — fallback', () => {
		expect(
			applyEnrichment({ title: 'A', category_slug: 'haker', content_md: 'Treść.' }, CATEGORIES, FALLBACK)[0],
		).toMatchObject({
			title: 'A',
			categorySlug: null,
			extraCategorySlugs: [],
		});
		expect(applyEnrichment('nie json', CATEGORIES, FALLBACK)).toEqual([]);
	});

	it('isSameEnrichDraft rozpoznaje identyczny fallback', () => {
		const a = enrichFallback('T', 'Treść');
		expect(isSameEnrichDraft(a, enrichFallback('T', 'Treść'))).toBe(true);
		expect(isSameEnrichDraft(a, { ...a, title: 'Inny' })).toBe(false);
	});

	it('pusta treść modelu zostawia treść maila; emoji z tytułu zdejmowane', () => {
		const [draft] = applyEnrichment(
			{ title: '📅 Festyn', category_slug: null, content_md: '   ' },
			CATEGORIES,
			FALLBACK,
		);
		expect(draft?.title).toBe('Festyn');
		expect(draft?.contentMd).toBe(FALLBACK.contentMd);
		expect(draft?.categorySlug).toBeNull();
	});

	it('bierze tylko pierwszy wpis z przesyłki, drop pisma, odrzuca nieznany plik', () => {
		const drafts = applyEnrichment(
			{
				posts: [
					{
						title: 'Obowiązek szczepienia',
						category_slug: 'aktualnosci',
						content_md: 'Przypominamy o szczepieniach.',
						attachments: [
							{ filename: 'szczepienia.pdf', display: 'embed' },
							{ filename: 'pismo.pdf', display: 'drop' },
							{ filename: 'ghost.pdf', display: 'embed' },
						],
					},
					{
						title: 'Plakaty',
						category_slug: null,
						content_md: 'Akcja przeciw wściekliźnie.',
						attachments: [
							{ filename: 'wscieklizna-1.pdf', display: 'embed' },
							{ filename: 'wscieklizna-2.pdf', display: 'embed' },
						],
					},
				],
			},
			CATEGORIES,
			FALLBACK,
			['szczepienia.pdf', 'wscieklizna-1.pdf', 'wscieklizna-2.pdf', 'pismo.pdf'],
			new Map([
				['szczepienia.pdf', 'Szczepienie psów i kotów — obowiązek 2026'],
				['wscieklizna-1.pdf', 'Akcja szczepień przeciw wściekliźnie'],
				['wscieklizna-2.pdf', 'Wścieklizna — punkty szczepień'],
				['pismo.pdf', 'Proszę o publikację'],
			]),
		);
		expect(drafts).toHaveLength(1);
		expect(drafts[0]?.title).toBe('Obowiązek szczepienia');
		expect(drafts[0]?.attachments).toEqual([
			{ filename: 'szczepienia.pdf', display: 'embed' },
			{ filename: 'pismo.pdf', display: 'drop' },
		]);
	});
});
