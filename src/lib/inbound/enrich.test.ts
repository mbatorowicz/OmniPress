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
			intent: 'create',
			posts: [
				{
					title: 'Uchwała w sprawie festynu',
					category_slug: 'aktualnosci',
					content_md: 'Rada Gminy uchwaliła organizację festynu.',
					attachments: [{ filename: 'uchwala.pdf', display: 'link' }],
				},
			],
		});
		const outcome = await enrichInboundDraft(
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
		expect(outcome).toEqual({
			kind: 'create',
			drafts: [
				{
					title: 'Uchwała w sprawie festynu',
					contentMd: 'Rada Gminy uchwaliła organizację festynu.',
					categorySlug: 'aktualnosci',
					extraCategorySlugs: [],
					attachments: [{ filename: 'uchwala.pdf', display: 'link' }],
				},
			],
		});
		expect(complete).toHaveBeenCalledTimes(1);
		expect(complete).toHaveBeenCalledWith(
			expect.objectContaining({
				system: inboundAi.system,
				prompt: expect.stringContaining('uchwala.pdf'),
				files: [],
			}),
		);
		vi.restoreAllMocks();
	});

	it('dwie sprawy z modelu → dwa szkice, bez drugiej tury z nazw', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		const complete = vi.fn().mockResolvedValue({
			intent: 'create',
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
		const outcome = await enrichInboundDraft(
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
			{ complete },
		);
		expect(outcome.kind).toBe('create');
		if (outcome.kind === 'create') {
			expect(outcome.drafts.map((row) => row.title)).toEqual(['Festyn gminny', 'Nabór do przedszkola']);
		}
		expect(complete).toHaveBeenCalledTimes(1);
		vi.restoreAllMocks();
	});

	it('gdy model dzieli po pliku, coalesce scala ujęcia', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		const complete = vi.fn().mockResolvedValue({
			intent: 'create',
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
		});
		const outcome = await enrichInboundDraft(
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
			{ complete },
		);
		expect(outcome.kind).toBe('create');
		if (outcome.kind === 'create') {
			expect(outcome.drafts).toHaveLength(2);
			expect(outcome.drafts[1]?.attachments).toHaveLength(2);
		}
		expect(complete).toHaveBeenCalledTimes(1);
		vi.restoreAllMocks();
	});

	it('timeout / błąd modelu → failed, bez szkicu z tematu', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const complete = vi.fn(
			(_input: { signal: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					_input.signal.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		);
		const outcome = await enrichInboundDraft(
			{
				title: 'FW: proszę opublikować',
				contentMd: 'Proszę o publikację.',
				attachments: [],
				categories: CATEGORIES,
			},
			{ complete, timeoutMs: 20 },
		);
		expect(outcome).toEqual({ kind: 'failed' });
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('przekazuje bajty obrazu do complete', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
		const complete = vi.fn().mockResolvedValue({
			intent: 'create',
			posts: [
				{
					title: 'Plakat szczepień',
					category_slug: 'aktualnosci',
					content_md: 'Obowiązek szczepienia.',
					attachments: [{ filename: 'plakat.jpg', display: 'embed' }],
				},
			],
		});
		await enrichInboundDraft(
			{
				title: 'Plakaty',
				contentMd: 'Proszę opublikować.',
				attachments: [
					{
						filename: 'plakat.jpg',
						mime: 'image/jpeg',
						text: '',
						pageCount: null,
						suggestedDisplay: 'embed',
						bytes,
					},
				],
				categories: CATEGORIES,
			},
			{ complete },
		);
		expect(complete.mock.calls[0]?.[0]?.files?.[0]).toMatchObject({
			filename: 'plakat.jpg',
			mediaType: 'image/jpeg',
		});
		vi.restoreAllMocks();
	});
});
