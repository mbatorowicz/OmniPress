import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
	SVIX_ID_HEADER,
	SVIX_SIGNATURE_HEADER,
	SVIX_TIMESTAMP_HEADER,
} from './webhook-auth';
import { handleInboundEmail } from './handle';
import type { CreateInboundDraftResult } from './create-draft';
import type { ReceivedInboundEmail } from './receiving';

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
const ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const TIMESTAMP = '1614265330';
const NOW = Number(TIMESTAMP);
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

function sign(body: string): string {
	const key = Buffer.from(SECRET.slice('whsec_'.length), 'base64');
	const digest = createHmac('sha256', key).update(`${ID}.${TIMESTAMP}.${body}`).digest('base64');
	return `v1,${digest}`;
}

function signedRequest(body: string): Request {
	return new Request('https://panel.test/api/inbound/email', {
		method: 'POST',
		headers: {
			[SVIX_ID_HEADER]: ID,
			[SVIX_TIMESTAMP_HEADER]: TIMESTAMP,
			[SVIX_SIGNATURE_HEADER]: sign(body),
		},
		body,
	});
}

function receivedEvent(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		type: 'email.received',
		data: { email_id: EMAIL_ID, from: FROM, subject: 'Re: Festyn gminny', ...overrides },
	});
}

const EMAIL: ReceivedInboundEmail = {
	id: EMAIL_ID,
	from: FROM,
	subject: 'Re: Festyn gminny',
	text: 'Zapraszamy na festyn.',
	html: null,
	inReplyTo: null,
	references: null,
};

const CREATED: CreateInboundDraftResult = {
	ok: true,
	postId: POST_ID,
	postIds: [POST_ID],
	created: true,
};

describe('handleInboundEmail', () => {
	it('zwraca 401 bez ważnego podpisu albo bez sekretu', async () => {
		const unsigned = await handleInboundEmail(
			new Request('https://panel.test/api/inbound/email', { method: 'POST', body: '{}' }),
			{ secret: SECRET, nowSec: NOW },
		);
		expect(unsigned.status).toBe(401);

		const noSecret = await handleInboundEmail(signedRequest('{}'), { secret: null, nowSec: NOW });
		expect(noSecret.status).toBe(401);
	});

	it('obcy From i zły typ eventu: 200 ignored bez Resend i insertu', async () => {
		const fetchEmail = vi.fn();
		const createDraft = vi.fn();
		const applyAttachments = vi.fn();
		const notify = vi.fn();
		const deps = {
			secret: SECRET,
			nowSec: NOW,
			draftConfig: DRAFT_CONFIG,
			fetchEmail,
			createDraft,
			applyAttachments,
			notify,
		};

		const wrongType = await handleInboundEmail(
			signedRequest(
				JSON.stringify({ type: 'email.sent', data: { email_id: EMAIL_ID, from: FROM } }),
			),
			deps,
		);
		expect(wrongType.status).toBe(200);
		await expect(wrongType.json()).resolves.toEqual({ ok: true, ignored: true });

		const stranger = await handleInboundEmail(
			signedRequest(receivedEvent({ from: 'obcy@example.com' })),
			deps,
		);
		expect(stranger.status).toBe(200);
		await expect(stranger.json()).resolves.toEqual({ ok: true, ignored: true });
		expect(fetchEmail).not.toHaveBeenCalled();
		expect(createDraft).not.toHaveBeenCalled();
		expect(applyAttachments).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});

	it('happy path: treść z Resend, szkic, Telegram bez Akceptuj', async () => {
		const fetchEmail = vi.fn().mockResolvedValue(EMAIL);
		const createDraft = vi.fn().mockResolvedValue(CREATED);
		const applyAttachments = vi.fn().mockResolvedValue(undefined);
		const notify = vi.fn().mockResolvedValue(undefined);

		const response = await handleInboundEmail(signedRequest(receivedEvent()), {
			secret: SECRET,
			nowSec: NOW,
			draftConfig: DRAFT_CONFIG,
			fetchEmail,
			createDraft,
			applyAttachments,
			notify,
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			ok: true,
			postId: POST_ID,
			postIds: [POST_ID],
			created: true,
		});
		expect(fetchEmail).toHaveBeenCalledWith(EMAIL_ID);
		expect(createDraft).toHaveBeenCalledWith({
			messageId: EMAIL_ID,
			from: FROM,
			siteSlug: 'gmina-miedzna',
			fallbackAuthorId: DRAFT_CONFIG.fallbackAuthorId,
			drafts: [{ title: 'Festyn gminny', contentMd: 'Zapraszamy na festyn.' }],
		});
		expect(applyAttachments).toHaveBeenCalledWith({
			postId: POST_ID,
			emailId: EMAIL_ID,
			contentMd: 'Zapraszamy na festyn.',
			decisions: expect.any(Map),
		});
		expect(notify).toHaveBeenCalledWith(POST_ID, 'Festyn gminny', { kind: 'draft' });
	});

	it('idempotentny retry nie pinga Telegrama drugi raz', async () => {
		const fetchEmail = vi.fn().mockResolvedValue(EMAIL);
		const createDraft = vi.fn().mockResolvedValue({
			ok: true,
			postId: POST_ID,
			postIds: [POST_ID],
			created: false,
		});
		const applyAttachments = vi.fn();
		const notify = vi.fn();

		const response = await handleInboundEmail(signedRequest(receivedEvent()), {
			secret: SECRET,
			nowSec: NOW,
			draftConfig: DRAFT_CONFIG,
			fetchEmail,
			createDraft,
			applyAttachments,
			notify,
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			ok: true,
			postId: POST_ID,
			postIds: [POST_ID],
			created: false,
		});
		expect(createDraft).toHaveBeenCalledTimes(1);
		expect(applyAttachments).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});

	it('Grok: posprzątany tytuł, kategoria i treść idą do szkicu', async () => {
		const fetchEmail = vi.fn().mockResolvedValue(EMAIL);
		const createDraft = vi.fn().mockResolvedValue(CREATED);
		const applyAttachments = vi.fn().mockResolvedValue(undefined);
		const notify = vi.fn().mockResolvedValue(undefined);
		const collectInventory = vi.fn().mockResolvedValue([
			{
				filename: 'uchwala.pdf',
				mime: 'application/pdf',
				text: 'Uchwała nr 12',
				pageCount: 3,
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
					title: 'Uchwała w sprawie festynu',
					contentMd: 'Rada Gminy organizuje festyn.',
					categorySlug: 'aktualnosci',
					extraCategorySlugs: [],
					attachments: [{ filename: 'uchwala.pdf', display: 'link' }],
				},
			],
		});

		const response = await handleInboundEmail(signedRequest(receivedEvent()), {
			secret: SECRET,
			nowSec: NOW,
			draftConfig: DRAFT_CONFIG,
			fetchEmail,
			createDraft,
			applyAttachments,
			notify,
			collectInventory,
			loadCategories,
			enrich,
		});

		expect(response.status).toBe(200);
		expect(enrich).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Festyn gminny',
				contentMd: 'Zapraszamy na festyn.',
			}),
		);
		expect(createDraft).toHaveBeenCalledWith({
			messageId: EMAIL_ID,
			from: FROM,
			siteSlug: 'gmina-miedzna',
			fallbackAuthorId: DRAFT_CONFIG.fallbackAuthorId,
			drafts: [
				{
					title: 'Uchwała w sprawie festynu',
					contentMd: 'Rada Gminy organizuje festyn.',
					categorySlug: 'aktualnosci',
					extraCategorySlugs: [],
				},
			],
		});
		expect(applyAttachments).toHaveBeenCalledWith({
			postId: POST_ID,
			emailId: EMAIL_ID,
			contentMd: 'Rada Gminy organizuje festyn.',
			decisions: expect.any(Map),
		});
		expect(notify).toHaveBeenCalledWith(POST_ID, 'Uchwała w sprawie festynu', {
			kind: 'draft',
		});
	});

	it('Grok failed: bez szkicu, pytanie na Telegram', async () => {
		const fetchEmail = vi.fn().mockResolvedValue(EMAIL);
		const createDraft = vi.fn();
		const applyAttachments = vi.fn();
		const notify = vi.fn().mockResolvedValue(undefined);
		const recordInbound = vi.fn().mockResolvedValue({ ok: true, created: true });
		const sendClarify = vi.fn().mockResolvedValue(true);
		const enrich = vi.fn().mockResolvedValue({ kind: 'failed' });

		const response = await handleInboundEmail(signedRequest(receivedEvent()), {
			secret: SECRET,
			nowSec: NOW,
			draftConfig: DRAFT_CONFIG,
			fetchEmail,
			createDraft,
			applyAttachments,
			notify,
			enrich,
			recordInbound,
			sendClarify,
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true, created: false, clarified: true });
		expect(createDraft).not.toHaveBeenCalled();
		expect(applyAttachments).not.toHaveBeenCalled();
		expect(sendClarify).toHaveBeenCalled();
		expect(notify).toHaveBeenCalledWith(null, 'Re: Festyn gminny', {
			kind: 'clarify',
			question: expect.any(String),
		});
	});
});
