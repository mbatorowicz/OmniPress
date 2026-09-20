import { describe, expect, it } from 'vitest';
import type { CategoryOption } from '@/lib/categories';
import { inboundAi } from '@/i18n';
import { resolveEnrichOutcome } from './enrich-outcome';

const CATEGORIES: CategoryOption[] = [
	{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
];
const FALLBACK = { title: 'Plakaty', contentMd: 'Proszę o publikację.' };

describe('resolveEnrichOutcome', () => {
	it('create z posts; zły JSON i puste posts → failed', () => {
		expect(
			resolveEnrichOutcome(
				{
					intent: 'create',
					posts: [
						{
							title: 'Festyn gminny',
							category_slug: 'aktualnosci',
							content_md: 'Zapraszamy.',
						},
					],
				},
				CATEGORIES,
				FALLBACK,
			).kind,
		).toBe('create');
		expect(resolveEnrichOutcome('nie json', CATEGORIES, FALLBACK)).toEqual({ kind: 'failed' });
		expect(resolveEnrichOutcome({ intent: 'create', posts: [] }, CATEGORIES, FALLBACK)).toEqual({
			kind: 'failed',
		});
	});

	it('clarify i niepewny replace nie tworzą wpisu', () => {
		expect(
			resolveEnrichOutcome(
				{ intent: 'clarify', clarification: { needed: true, question: 'Który plakat?' } },
				CATEGORIES,
				FALLBACK,
			),
		).toEqual({ kind: 'clarify', question: 'Który plakat?' });
		expect(
			resolveEnrichOutcome({ intent: 'replace' }, CATEGORIES, FALLBACK),
		).toEqual({ kind: 'clarify', question: inboundAi.unclearReplace });
	});

	it('pewny replace z hintem', () => {
		expect(
			resolveEnrichOutcome(
				{
					intent: 'replace',
					replace: { target: 'post', hint: 'https://gmina-miedzna.pl/aktualnosci/festyn', filename: 'a.pdf' },
				},
				CATEGORIES,
				FALLBACK,
			),
		).toEqual({
			kind: 'replace',
			replace: {
				target: 'post',
				hint: 'https://gmina-miedzna.pl/aktualnosci/festyn',
				filename: 'a.pdf',
				display: null,
			},
		});
	});
});
