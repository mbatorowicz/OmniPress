import { jsonError, jsonOk } from '@/lib/api/response';
import type { CategoryOption } from '@/lib/categories';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { applyInboundAttachmentsLive } from './apply-attachments-live';
import { buildAttachmentDecisions } from './attachment-assign';
import { collectInboundInventoryLive } from './collect-attachment-texts-live';
import { inboundDraftConfig, type InboundDraftConfig } from './config';
import {
	createInboundDraft,
	type CreateInboundDraftInput,
	type CreateInboundDraftResult,
} from './create-draft';
import { enrichInboundDraft } from './enrich';
import type { EnrichDraft } from './enrich-model';
import type { InboundEmailDeps } from './handle-deps';
import { inboundAiConfigured, inboundAiEnvFromMeta } from './inbound-ai-config';
import { resolveInboundSiteSlug } from './inbound-site';
import { loadInboundSiteCategories } from './load-inbound-categories';
import { notifyInboundDraft } from './notify-draft';
import { prepareInboundDraft } from './prepare-inbound-draft';
import type { ReceivedInboundEmail } from './receiving';

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
	siteSlug: string,
	fallbackAuthorId: string,
	drafts: EnrichDraft[],
): CreateInboundDraftInput {
	return {
		messageId: event.emailId,
		from: email.from || event.from,
		siteSlug,
		fallbackAuthorId,
		drafts: drafts.map((draft) => ({
			title: draft.title,
			contentMd: draft.contentMd,
			...(draft.categorySlug
				? { categorySlug: draft.categorySlug, extraCategorySlugs: draft.extraCategorySlugs }
				: {}),
		})),
	};
}

/** Po fetchu z Resend: jednostka, Grok, szkice, załączniki, Telegram. */
export async function ingestFetchedInbound(
	event: { emailId: string; from: string; subject: string },
	email: ReceivedInboundEmail,
	deps: InboundEmailDeps = {},
): Promise<Response> {
	const draftConfig = readDraftConfig(deps);
	if (!draftConfig) return jsonOk({ ignored: true });

	const siteSlug = resolveInboundSiteSlug(
		`${email.text ?? ''}\n${email.html ?? ''}`,
		email.from || event.from,
		draftConfig,
	);
	const shouldEnrich =
		deps.enrich !== undefined || (deps.aiConfigured ?? inboundAiConfigured(inboundAiEnvFromMeta()));
	const prepared = await prepareInboundDraft({
		subject: email.subject || event.subject,
		text: email.text,
		html: email.html,
		siteSlug,
		emailId: event.emailId,
		shouldEnrich,
		collectInventory: deps.collectInventory ?? collectInboundInventoryLive,
		loadCategories: deps.loadCategories ?? defaultLoadCategories,
		enrich: deps.enrich ?? enrichInboundDraft,
	});

	const result = await (deps.createDraft ?? defaultCreateDraft)(
		toCreateInput(event, email, siteSlug, draftConfig.fallbackAuthorId, prepared.drafts),
	);
	if (!result.ok) return jsonError(result.error, 500);

	if (result.created) {
		const decisions = buildAttachmentDecisions(
			prepared.drafts,
			result.postIds,
			prepared.inventory,
		);
		await (deps.applyAttachments ?? applyInboundAttachmentsLive)({
			postId: result.postId,
			emailId: event.emailId,
			contentMd: prepared.drafts[0]?.contentMd ?? '',
			decisions,
		});
		for (const [index, draft] of prepared.drafts.entries()) {
			const postId = result.postIds[index] ?? result.postId;
			await (deps.notify ?? notifyInboundDraft)(postId, draft.title, {
				unprocessed: prepared.aiFallback,
			});
		}
	}
	return jsonOk({ postId: result.postId, postIds: result.postIds, created: result.created });
}
