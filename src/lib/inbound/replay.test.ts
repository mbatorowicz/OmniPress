import { describe, expect, it, vi } from 'vitest';
import { inbound } from '@/i18n';
import { parseReplayEmailId, replayInboundEmail } from './replay';

const EMAIL_ID = '56761188-7520-42d8-8898-ff6fc54ce618';
const POST_ID = '44444444-4444-4444-8444-444444444444';
const FROM = 'jan@cncsolutions.dev';

const DRAFT_CONFIG = {
	allowedFrom: FROM,
	defaultSiteSlug: 'gmina-miedzna',
	fallbackAuthorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	siteByEmail: {},
	siteByDomain: [],
};

describe('parseReplayEmailId', () => {
	it('odrzuca pusty, ścieżkę i znaki zapytania', () => {
		expect(parseReplayEmailId('')).toBeNull();
		expect(parseReplayEmailId('a/b')).toBeNull();
		expect(parseReplayEmailId(`${EMAIL_ID}?x=1`)).toBeNull();
		expect(parseReplayEmailId(EMAIL_ID)).toBe(EMAIL_ID);
	});
});

describe('replayInboundEmail', () => {
	it('nie kasuje szkicu, gdy Resend nie oddaje maila', async () => {
		const forgetPrevious = vi.fn();
		const createDraft = vi.fn();
		const response = await replayInboundEmail(EMAIL_ID, {
			draftConfig: DRAFT_CONFIG,
			fetchEmail: async () => null,
			forgetPrevious,
			createDraft,
		});
		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toEqual({
			ok: false,
			error: inbound.replay.fetchFailed,
		});
		expect(forgetPrevious).not.toHaveBeenCalled();
		expect(createDraft).not.toHaveBeenCalled();
	});

	it('kasuje poprzedni szkic i tworzy nowy po udanym fetchu', async () => {
		const forgetPrevious = vi.fn();
		const createDraft = vi.fn().mockResolvedValue({
			ok: true,
			postId: POST_ID,
			postIds: [POST_ID],
			created: true,
		});
		const applyAttachments = vi.fn().mockResolvedValue(undefined);
		const notify = vi.fn().mockResolvedValue(undefined);
		const enrich = vi.fn().mockResolvedValue([
			{
				title: 'Szczepienie pupila',
				contentMd: 'Obowiązek szczepienia.',
				categorySlug: 'aktualnosci',
				extraCategorySlugs: [],
				attachments: [],
			},
			{
				title: 'Wścieklizna — zasady',
				contentMd: 'Obszar zagrożony.',
				categorySlug: 'aktualnosci',
				extraCategorySlugs: [],
				attachments: [],
			},
		]);

		const response = await replayInboundEmail(EMAIL_ID, {
			draftConfig: DRAFT_CONFIG,
			fetchEmail: async () => ({
				id: EMAIL_ID,
				from: FROM,
				subject: 'Plakaty',
				text: 'Proszę opublikować.',
				html: null,
			}),
			forgetPrevious,
			createDraft,
			applyAttachments,
			notify,
			enrich,
			collectInventory: async () => [],
			loadCategories: async () => [{ slug: 'aktualnosci', name: 'Aktualności', sources: [] }],
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			ok: true,
			postId: POST_ID,
			postIds: [POST_ID],
			created: true,
		});
		expect(forgetPrevious).toHaveBeenCalledWith(EMAIL_ID);
		expect(forgetPrevious.mock.invocationCallOrder[0]).toBeLessThan(
			createDraft.mock.invocationCallOrder[0] ?? 0,
		);
		expect(createDraft).toHaveBeenCalledWith(
			expect.objectContaining({
				messageId: EMAIL_ID,
				drafts: [
					expect.objectContaining({ title: 'Szczepienie pupila' }),
					expect.objectContaining({ title: 'Wścieklizna — zasady' }),
				],
			}),
		);
		expect(notify).toHaveBeenCalledTimes(2);
	});
});
