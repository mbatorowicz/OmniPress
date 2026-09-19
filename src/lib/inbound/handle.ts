import { jsonError, jsonOk } from '@/lib/api/response';
import type { CategoryOption } from '@/lib/categories';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { isAllowedFrom, parseAllowlist } from './allowlist';
import { applyInboundAttachmentsLive } from './apply-attachments-live';
import { collectExtractableAttachmentTextsLive } from './collect-attachment-texts-live';
import { inboundDraftConfig, type InboundDraftConfig } from './config';
import {
	createInboundDraft,
	type CreateInboundDraftInput,
	type CreateInboundDraftResult,
} from './create-draft';
import { enrichInboundDraft, type EnrichInboundInput } from './enrich';
import type { EnrichDraft } from './enrich-model';
import type { ExtractedAttachmentText } from './extract-attachment-text';
import { inboundAiConfigured, inboundAiEnvFromMeta } from './inbound-ai-config';
import { loadInboundSiteCategories } from './load-inbound-categories';
import { notifyInboundDraft } from './notify-draft';
import { prepareInboundDraft } from './prepare-inbound-draft';
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
	notify?: (postId: string, title: string, opts?: { unprocessed?: boolean }) => Promise<void>;
	collectAttachmentTexts?: (emailId: string) => Promise<ExtractedAttachmentText[]>;
	loadCategories?: (siteSlug: string) => Promise<CategoryOption[]>;
	enrich?: (input: EnrichInboundInput) => Promise<EnrichDraft>;
	aiConfigured?: boolean;
};

function readSecret(deps: InboundEmailDeps): string {
	return deps.secret !== undefined ? (deps.secret ?? '') : inboundWebhookSecret();
}

function readDraftConfig(deps: InboundEmailDeps): InboundDraftConfig | null {
	return deps.draftConfig !== undefined ? deps.draftConfig : inboundDraftConfig();
}

async function defaultCreateDraft(input: CreateInboundDraftInput): Promise<CreateInboundDraftResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'insert_failed' };
	return createInboundDraft(createServiceSupabase(), input);
}

async function defaultLoadCategories(siteSlug: string): Promise<CategoryOption[]> {
	if (!isServiceSupabaseConfigured()) return [];
	return loadInboundSiteCategories(createServiceSupabase(), siteSlug);
}

function toCreateInput(
	event: { emailId: string; from: string },
	email: ReceivedInboundEmail,
	draftConfig: InboundDraftConfig,
	draft: EnrichDraft,
): CreateInboundDraftInput {
	return {
		messageId: event.emailId,
		from: email.from || event.from,
		title: draft.title,
		contentMd: draft.contentMd,
		siteSlug: draftConfig.defaultSiteSlug,
		fallbackAuthorId: draftConfig.fallbackAuthorId,
		...(draft.categorySlug
			? { categorySlug: draft.categorySlug, extraCategorySlugs: draft.extraCategorySlugs }
			: {}),
	};
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
	const fetchEmail = deps.fetchEmail ?? ((id) => getReceivedEmail(id, { apiKey }));
	if (!deps.fetchEmail && !apiKey) return jsonOk({ ignored: true });

	const email = await fetchEmail(event.emailId);
	if (!email) return jsonError('fetch_failed', 502);

	const shouldEnrich =
		deps.enrich !== undefined || (deps.aiConfigured ?? inboundAiConfigured(inboundAiEnvFromMeta()));
	const draft = await prepareInboundDraft({
		subject: email.subject || event.subject,
		text: email.text,
		html: email.html,
		siteSlug: draftConfig.defaultSiteSlug,
		emailId: event.emailId,
		shouldEnrich,
		collectTexts: deps.collectAttachmentTexts ?? collectExtractableAttachmentTextsLive,
		loadCategories: deps.loadCategories ?? defaultLoadCategories,
		enrich: deps.enrich ?? enrichInboundDraft,
	});

	const result = await (deps.createDraft ?? defaultCreateDraft)(
		toCreateInput(event, email, draftConfig, draft),
	);
	if (!result.ok) return jsonError(result.error, 500);

	if (result.created) {
		await (deps.applyAttachments ?? applyInboundAttachmentsLive)({
			postId: result.postId,
			emailId: event.emailId,
			contentMd: draft.contentMd,
		});
		await (deps.notify ?? notifyInboundDraft)(result.postId, draft.title, {
			unprocessed: draft.aiFallback,
		});
	}
	return jsonOk({ postId: result.postId, created: result.created });
}
