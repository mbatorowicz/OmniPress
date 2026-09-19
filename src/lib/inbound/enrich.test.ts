import { describe, expect, it, vi } from 'vitest';
import type { CategoryOption } from '@/lib/categories';
import { inboundAi } from '@/i18n';
import { enrichInboundDraft } from './enrich';

const CATEGORIES: CategoryOption[] = [
	{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
];

describe('enrichInboundDraft', () => {
	it('pismo przewodnie + PDF → tytuł i kategoria z kompletnego JSON', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
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
		expect(complete).toHaveBeenCalledTimes(1);
		expect(complete).toHaveBeenCalledWith(
			expect.objectContaining({
				system: inboundAi.system,
				prompt: expect.stringContaining('uchwala.pdf'),
			}),
		);
		vi.restoreAllMocks();
	});

	it('jeden lead na dwie sprawy → druga tura z osobnymi wpisami', async () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const complete = vi
			.fn()
			.mockResolvedValueOnce({
				posts: [
					{
						title: 'Festyn i nabór',
						category_slug: 'aktualnosci',
						content_md: 'Festyn gminny. Nabór do przedszkola.',
						attachments: [
							{ filename: 'festyn-gminny.pdf', display: 'embed' },
							{ filename: 'nabor-przedszkole.pdf', display: 'embed' },
						],
					},
				],
			})
			.mockResolvedValueOnce({
				posts: [
					{
						title: 'Festyn gminny',
						category_slug: 'aktualnosci',
						content_md: 'Zapraszamy na festyn.',
						attachments: [{ filename: 'festyn-gminny.pdf', display: 'embed' }],
					},
					{
						title: 'Nabór do przedszkola',
						category_slug: 'aktualnosci',
						content_md: 'Rusza nabór.',
						attachments: [{ filename: 'nabor-przedszkole.pdf', display: 'embed' }],
					},
				],
			});
		const drafts = await enrichInboundDraft(
			{
				title: 'Materiały',
				contentMd: 'Proszę o publikację.',
				attachments: [
					{
						filename: 'festyn-gminny.pdf',
						mime: 'application/pdf',
						text: '',
						pageCount: 1,
						suggestedDisplay: 'embed',
					},
					{
						filename: 'nabor-przedszkole.pdf',
						mime: 'application/pdf',
						text: '',
						pageCount: 1,
						suggestedDisplay: 'embed',
					},
				],
				categories: CATEGORIES,
			},
			{ complete, timeoutMs: 20_000 },
		);
		expect(drafts).toHaveLength(2);
		expect(drafts.map((row) => row.title)).toEqual(['Festyn gminny', 'Nabór do przedszkola']);
		expect(complete).toHaveBeenCalledTimes(2);
		expect(complete.mock.calls[1]?.[0]?.system).toContain('2 osobne sprawy');
		expect(String(info.mock.calls[0]?.[0])).toContain('"posts":2');
		info.mockRestore();
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
