import { describe, expect, it, vi } from 'vitest';
import { prepareInboundDraft } from './prepare-inbound-draft';

const BASE = {
	subject: 'Re: Festyn gminny',
	text: 'Zapraszamy na festyn.',
	html: null,
	siteSlug: 'gmina-miedzna',
	emailId: 'email-1',
	collectTexts: vi.fn().mockResolvedValue([]),
	loadCategories: vi.fn().mockResolvedValue([]),
	enrich: vi.fn(),
};

describe('prepareInboundDraft', () => {
	it('bez AI: temat i treść, bez collect/enrich', async () => {
		const draft = await prepareInboundDraft({ ...BASE, shouldEnrich: false });
		expect(draft).toEqual({
			title: 'Festyn gminny',
			contentMd: 'Zapraszamy na festyn.',
			categorySlug: null,
			extraCategorySlugs: [],
			aiFallback: false,
		});
		expect(BASE.collectTexts).not.toHaveBeenCalled();
		expect(BASE.enrich).not.toHaveBeenCalled();
	});

	it('z AI: przekazuje załączniki i kategorie do enrich', async () => {
		const collectTexts = vi.fn().mockResolvedValue([
			{ filename: 'a.pdf', mime: 'application/pdf', text: 'Uchwała' },
		]);
		const loadCategories = vi.fn().mockResolvedValue([
			{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] },
		]);
		const enrich = vi.fn().mockResolvedValue({
			title: 'Uchwała',
			contentMd: 'Treść uchwały.',
			categorySlug: 'aktualnosci',
			extraCategorySlugs: [],
		});
		const draft = await prepareInboundDraft({
			...BASE,
			shouldEnrich: true,
			collectTexts,
			loadCategories,
			enrich,
		});
		expect(draft.categorySlug).toBe('aktualnosci');
		expect(draft.aiFallback).toBe(false);
		expect(enrich).toHaveBeenCalledWith({
			title: 'Festyn gminny',
			contentMd: 'Zapraszamy na festyn.',
			attachments: [{ filename: 'a.pdf', mime: 'application/pdf', text: 'Uchwała' }],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności', sources: ['github_astro'] }],
		});
	});

	it('Grok zwraca surowy mail → aiFallback', async () => {
		const enrich = vi.fn().mockResolvedValue({
			title: 'Festyn gminny',
			contentMd: 'Zapraszamy na festyn.',
			categorySlug: null,
			extraCategorySlugs: [],
		});
		const draft = await prepareInboundDraft({ ...BASE, shouldEnrich: true, enrich });
		expect(draft.aiFallback).toBe(true);
	});
});
