import { jsonError, jsonOk } from '@/lib/api/response';
import { common } from '@/i18n';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { isAllowedFrom, parseAllowlist } from './allowlist';
import { applyInboundAttachmentsLive } from './apply-attachments-live';
import { inboundDraftConfig, type InboundDraftConfig } from './config';
import {
	createInboundDraft,
	type CreateInboundDraftInput,
	type CreateInboundDraftResult,
} from './create-draft';
import { notifyInboundDraft } from './notify-draft';
import { parseInboundBody } from './parse-body';
import { parseInboundSubject } from './parse-subject';
import { getReceivedEmail, inboundResendApiKey, type ReceivedInboundEmail } from './receiving';
import { authorizeInboundWebhook, inboundWebhookSecret } from './webhook-auth';
import { parseEmailReceivedEvent } from './webhook-event';

export type ApplyInboundAttachmentsFn = (input: {
	postId: string;
	emailId: string;
	contentMd: string;
}) => Promise<void>;

export type InboundEmailDeps = {
	secret?: string | null;
	nowSec?: number;
	apiKey?: string | null;
	draftConfig?: InboundDraftConfig | null;
	fetchEmail?: (emailId: string) => Promise<ReceivedInboundEmail | null>;
	createDraft?: (input: CreateInboundDraftInput) => Promise<CreateInboundDraftResult>;
	applyAttachments?: ApplyInboundAttachmentsFn;
	notify?: (postId: string, title: string) => Promise<void>;
};

function readSecret(deps: InboundEmailDeps): string {
	return deps.secret !== undefined ? (deps.secret ?? '') : inboundWebhookSecret();
}

function readDraftConfig(deps: InboundEmailDeps): InboundDraftConfig | null {
	return deps.draftConfig !== undefined ? deps.draftConfig : inboundDraftConfig();
}

async function defaultCreateDraft(
	input: CreateInboundDraftInput,
): Promise<CreateInboundDraftResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'insert_failed' };
	return createInboundDraft(createServiceSupabase(), input);
}

async function defaultFetchEmail(
	emailId: string,
	apiKey: string,
): Promise<ReceivedInboundEmail | null> {
	return getReceivedEmail(emailId, { apiKey });
}

export async function handleInboundEmail(
	request: Request,
	deps: InboundEmailDeps = {},
): Promise<Response> {
	const rawBody = await request.text();
	if (!authorizeInboundWebhook(request.headers, rawBody, readSecret(deps), deps.nowSec)) {
		return new Response('Unauthorized', { status: 401 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody) as unknown;
	} catch {
		return jsonOk({ ignored: true });
	}

	const event = parseEmailReceivedEvent(payload);
	const draftConfig = readDraftConfig(deps);
	if (!event || !draftConfig) return jsonOk({ ignored: true });
	if (!isAllowedFrom(event.from, parseAllowlist(draftConfig.allowedFrom))) {
		return jsonOk({ ignored: true });
	}

	const apiKey = deps.apiKey !== undefined ? (deps.apiKey ?? '') : inboundResendApiKey();
	const fetchEmail = deps.fetchEmail ?? ((id) => defaultFetchEmail(id, apiKey));
	if (!deps.fetchEmail && !apiKey) return jsonOk({ ignored: true });

	const email = await fetchEmail(event.emailId);
	if (!email) return jsonError('fetch_failed', 502);

	const title = parseInboundSubject(email.subject || event.subject) || common.untitled;
	const contentMd = parseInboundBody({ text: email.text, html: email.html });
	const result = await (deps.createDraft ?? defaultCreateDraft)({
		messageId: event.emailId,
		from: email.from || event.from,
		title,
		contentMd,
		siteSlug: draftConfig.defaultSiteSlug,
		fallbackAuthorId: draftConfig.fallbackAuthorId,
	});
	if (!result.ok) return jsonError(result.error, 500);

	if (result.created) {
		await (deps.applyAttachments ?? applyInboundAttachmentsLive)({
			postId: result.postId,
			emailId: event.emailId,
			contentMd,
		});
		await (deps.notify ?? notifyInboundDraft)(result.postId, title);
	}
	return jsonOk({ postId: result.postId, created: result.created });
}
