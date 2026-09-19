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

	it('trzy wpisy na dwa komunikaty → druga tura scala ujęcia', async () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const complete = vi
			.fn()
			.mockResolvedValueOnce({
				posts: [
					{
						title: 'Zaszczep pupila',
						category_slug: 'aktualnosci',
						content_md: 'Obowiązek szczepienia.',
						attachments: [{ filename: 'plakat_Zaszczep_pupila.jpg', display: 'embed' }],
					},
					{
						title: 'Wścieklizna - obszar',
						category_slug: 'aktualnosci',
						content_md: 'Obszar zagrożony.',
						attachments: [
							{ filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf', display: 'embed' },
						],
					},
					{
						title: 'Wścieklizna - zasady',
						category_slug: 'aktualnosci',
						content_md: 'Zasady zachowania.',
						attachments: [
							{ filename: 'Plakat_wścieklizna_zasady_zachowania.pdf', display: 'embed' },
						],
					},
				],
			})
			.mockResolvedValueOnce({
				posts: [
					{
						title: 'Zaszczep pupila',
						category_slug: 'aktualnosci',
						content_md: 'Obowiązek szczepienia.',
						attachments: [{ filename: 'plakat_Zaszczep_pupila.jpg', display: 'embed' }],
					},
					{
						title: 'Wścieklizna',
						category_slug: 'aktualnosci',
						content_md: 'Obszar zagrożony i zasady zachowania.',
						attachments: [
							{ filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf', display: 'embed' },
							{ filename: 'Plakat_wścieklizna_zasady_zachowania.pdf', display: 'embed' },
						],
					},
				],
			});
		const drafts = await enrichInboundDraft(
			{
				title: 'Plakaty',
				contentMd: 'Proszę o publikację.',
				attachments: [
					{
						filename: 'plakat_Zaszczep_pupila.jpg',
						mime: 'image/jpeg',
						text: '',
						pageCount: null,
						suggestedDisplay: 'embed',
					},
					{
						filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
						mime: 'application/pdf',
						text: 'Obszar zagrożony wścieklizną',
						pageCount: 1,
						suggestedDisplay: 'embed',
					},
					{
						filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
						mime: 'application/pdf',
						text: 'Zasady zachowania przy wściekliźnie',
						pageCount: 1,
						suggestedDisplay: 'embed',
					},
				],
				categories: CATEGORIES,
			},
			{ complete, timeoutMs: 20_000 },
		);
		expect(drafts).toHaveLength(2);
		expect(drafts.map((row) => row.title)).toEqual(['Zaszczep pupila', 'Wścieklizna']);
		expect(drafts[1]?.attachments.map((row) => row.filename)).toEqual([
			'Plakat_wścieklizna_obszar_zagrożony.pdf',
			'Plakat_wścieklizna_zasady_zachowania.pdf',
		]);
		expect(complete).toHaveBeenCalledTimes(2);
		expect(complete.mock.calls[1]?.[0]?.system).toContain('Za dużo wpisów (3 zamiast 2)');
		info.mockRestore();
	});

	it('gdy druga tura nadal dzieli po pliku, scala ujęcia z nazw', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		const three = {
			posts: [
				{
					title: 'Zaszczep pupila',
					category_slug: 'aktualnosci',
					content_md: 'Obowiązek szczepienia.',
					attachments: [{ filename: 'plakat_Zaszczep_pupila.jpg', display: 'embed' }],
				},
				{
					title: 'Wścieklizna - obszar',
					category_slug: 'aktualnosci',
					content_md: 'Obszar zagrożony.',
					attachments: [{ filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf', display: 'embed' }],
				},
				{
					title: 'Wścieklizna - zasady',
					category_slug: 'aktualnosci',
					content_md: 'Zasady zachowania.',
					attachments: [{ filename: 'Plakat_wścieklizna_zasady_zachowania.pdf', display: 'embed' }],
				},
			],
		};
		const complete = vi.fn().mockResolvedValue(three);
		const drafts = await enrichInboundDraft(
			{
				title: 'Plakaty',
				contentMd: 'Proszę o publikację.',
				attachments: [
					{
						filename: 'plakat_Zaszczep_pupila.jpg',
						mime: 'image/jpeg',
						text: 'Zaszczep pupila przeciw wściekliźnie',
						pageCount: null,
						suggestedDisplay: 'embed',
					},
					{
						filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
						mime: 'application/pdf',
						text: 'Obszar zagrożony wścieklizną',
						pageCount: 1,
						suggestedDisplay: 'embed',
					},
					{
						filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
						mime: 'application/pdf',
						text: 'Zasady zachowania przy wściekliźnie',
						pageCount: 1,
						suggestedDisplay: 'embed',
					},
				],
				categories: CATEGORIES,
			},
			{ complete, timeoutMs: 20_000 },
		);
		expect(drafts).toHaveLength(2);
		expect(drafts[1]?.title).toBe('Wścieklizna');
		expect(drafts[1]?.attachments).toHaveLength(2);
		vi.restoreAllMocks();
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
