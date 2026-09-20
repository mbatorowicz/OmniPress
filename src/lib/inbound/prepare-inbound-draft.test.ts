import { describe, expect, it, vi } from 'vitest';
import { prepareInboundDraft } from './prepare-inbound-draft';
import { inbound } from '@/i18n';

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
			kind: 'create',
			drafts: [
				{
					title: 'Festyn gminny',
					contentMd: 'Zapraszamy na festyn.',
					categorySlug: null,
					extraCategorySlugs: [],
					attachments: [],
				},
			],
			inventory: [],
		});
		expect(BASE.collectInventory).not.toHaveBeenCalled();
		expect(BASE.enrich).not.toHaveBeenCalled();
	});

	it('z AI: przekazuje załączniki, kategorie i nazwę jednostki', async () => {
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
		const enrich = vi.fn().mockResolvedValue({
			kind: 'create',
			drafts: [
				{
					title: 'Uchwała',
					contentMd: 'Treść uchwały.',
					categorySlug: 'aktualnosci',
					extraCategorySlugs: [],
					attachments: [{ filename: 'a.pdf', display: 'link' }],
				},
			],
		});
		const loadSiteName = vi.fn().mockResolvedValue('Gmina Miedzna');
		const prepared = await prepareInboundDraft({
			...BASE,
			shouldEnrich: true,
			collectInventory,
			loadCategories,
			loadSiteName,
			enrich,
		});
		expect(prepared.kind).toBe('create');
		if (prepared.kind === 'create') {
			expect(prepared.drafts[0]?.categorySlug).toBe('aktualnosci');
		}
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
			siteName: 'Gmina Miedzna',
		});
	});

	it('timeout Groka → clarify, bez szkicu z tematu', async () => {
		const enrich = vi.fn().mockResolvedValue({ kind: 'failed' });
		const prepared = await prepareInboundDraft({ ...BASE, shouldEnrich: true, enrich });
		expect(prepared).toEqual({
			kind: 'clarify',
			question: inbound.failedQuestion,
			inventory: [],
		});
	});
});
