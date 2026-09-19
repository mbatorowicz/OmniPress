import { describe, expect, it, vi } from 'vitest';
import { prepareInboundDraft } from './prepare-inbound-draft';

const BASE = {
	subject: 'Re: Festyn gminny',
	text: 'Zapraszamy na festyn.',
	html: null,
	siteSlug: 'gmina-miedzna',
	emailId: 'email-1',
	collectInventory: vi.fn().mockResolvedValue([]),
	loadCategories: vi.fn().mockResolvedValue([]),
	enrich: vi.fn(),
};

describe('prepareInboundDraft', () => {
	it('bez AI: temat i treść, bez collect/enrich', async () => {
		const prepared = await prepareInboundDraft({ ...BASE, shouldEnrich: false });
		expect(prepared).toEqual({
			drafts: [
				{
					title: 'Festyn gminny',
					contentMd: 'Zapraszamy na festyn.',
					categorySlug: null,
					extraCategorySlugs: [],
					attachments: [],
				},
			],
			aiFallback: false,
			inventory: [],
		});
		expect(BASE.collectInventory).not.toHaveBeenCalled();
		expect(BASE.enrich).not.toHaveBeenCalled();
	});

	it('z AI: przekazuje załączniki i kategorie do enrich', async () => {
		const collectInventory = vi.fn().mockResolvedValue([
			{
				filename: 'a.pdf',
				mime: 'application/pdf',
				text: 'Uchwała',
				pageCount: 2,
				suggestedDisplay: 'link',
			},
		]);
		const loadCategories = vi.fn().mockResolvedValue([
			{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
		]);
		const enrich = vi.fn().mockResolvedValue([
			{
				title: 'Uchwała',
				contentMd: 'Treść uchwały.',
				categorySlug: 'aktualnosci',
				extraCategorySlugs: [],
				attachments: [{ filename: 'a.pdf', display: 'link' }],
			},
		]);
		const prepared = await prepareInboundDraft({
			...BASE,
			shouldEnrich: true,
			collectInventory,
			loadCategories,
			enrich,
		});
		expect(prepared.drafts[0]?.categorySlug).toBe('aktualnosci');
		expect(prepared.aiFallback).toBe(false);
		expect(enrich).toHaveBeenCalledWith({
			title: 'Festyn gminny',
			contentMd: 'Zapraszamy na festyn.',
			attachments: [
				{
					filename: 'a.pdf',
					mime: 'application/pdf',
					text: 'Uchwała',
					pageCount: 2,
					suggestedDisplay: 'link',
				},
			],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] }],
		});
	});

	it('Grok zwraca surowy mail → aiFallback', async () => {
		const enrich = vi.fn().mockResolvedValue([
			{
				title: 'Festyn gminny',
				contentMd: 'Zapraszamy na festyn.',
				categorySlug: null,
				extraCategorySlugs: [],
				attachments: [],
			},
		]);
		const prepared = await prepareInboundDraft({ ...BASE, shouldEnrich: true, enrich });
		expect(prepared.aiFallback).toBe(true);
	});
});
