import { describe, expect, it, vi } from 'vitest';
import type { CategoryOption } from '@/lib/categories';
import { inboundAi } from '@/i18n';
import { enrichInboundDraft } from './enrich';

const CATEGORIES: CategoryOption[] = [
	{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
];

describe('enrichInboundDraft', () => {
	it('pismo przewodnie + PDF → tytuł i kategoria z kompletnego JSON', async () => {
		const complete = vi.fn().mockResolvedValue({
			posts: [
				{
					title: 'Uchwała w sprawie festynu',
					category_slug: 'aktualnosci',
					content_md: 'Rada Gminy uchwaliła organizację festynu.',
					attachments: [{ filename: 'uchwala.pdf', display: 'link' }],
				},
			],
		});
		const drafts = await enrichInboundDraft(
			{
				title: 'Bez tytułu',
				contentMd: 'Dzień dobry, proszę o publikację załącznika.\nPozdrawiam',
				attachments: [
					{
						filename: 'uchwala.pdf',
						mime: 'application/pdf',
						text: 'Uchwała nr 12/2026',
						pageCount: 4,
						suggestedDisplay: 'link',
					},
				],
				categories: CATEGORIES,
			},
			{ complete },
		);
		expect(drafts).toEqual([
			{
				title: 'Uchwała w sprawie festynu',
				contentMd: 'Rada Gminy uchwaliła organizację festynu.',
				categorySlug: 'aktualnosci',
				extraCategorySlugs: [],
				attachments: [{ filename: 'uchwala.pdf', display: 'link' }],
			},
		]);
		expect(complete).toHaveBeenCalledWith(
			expect.objectContaining({
				system: inboundAi.system,
				prompt: expect.stringContaining('uchwala.pdf'),
			}),
		);
	});

	it('timeout / błąd modelu → surowy temat i treść, bez kategorii', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const complete = vi.fn(
			(_input: { signal: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					_input.signal.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		);
		const drafts = await enrichInboundDraft(
			{
				title: 'FW: proszę opublikować',
				contentMd: 'Proszę o publikację.',
				attachments: [],
				categories: CATEGORIES,
			},
			{ complete, timeoutMs: 20 },
		);
		expect(drafts).toEqual([
			{
				title: 'FW: proszę opublikować',
				contentMd: 'Proszę o publikację.',
				categorySlug: null,
				extraCategorySlugs: [],
				attachments: [],
			},
		]);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
