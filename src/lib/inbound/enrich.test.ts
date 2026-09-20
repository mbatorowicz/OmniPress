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

	it('dwie sprawy z modelu → i tak jeden szkic', async () => {
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
			expect(outcome.drafts).toHaveLength(1);
			expect(outcome.drafts[0]?.title).toBe('Festyn gminny');
		}
		expect(complete).toHaveBeenCalledTimes(1);
		vi.restoreAllMocks();
	});

	it('gdy model pyta, zostaje pytanie — bez podziału na szkice', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		const complete = vi.fn().mockResolvedValue({
			intent: 'clarify',
			clarification: { needed: true, question: 'Który wpis wymienić?' },
		});
		const outcome = await enrichInboundDraft(
			{
				title: 'Plakaty',
				contentMd: 'Proszę o publikację.',
				attachments: [
					{
						filename: 'plakat.jpg',
						mime: 'image/jpeg',
						text: '',
						pageCount: null,
						suggestedDisplay: 'embed',
					},
				],
				categories: CATEGORIES,
			},
			{ complete },
		);
		expect(outcome).toEqual({ kind: 'clarify', question: 'Który wpis wymienić?' });
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
