import { jsonOk } from '@/lib/api/response';
import { inboundDraftConfig, type InboundDraftConfig } from './config';
import { enrichInboundDraft } from './enrich';
import type { InboundEmailDeps } from './handle-deps';
import { inboundAiConfigured, inboundAiEnvFromMeta } from './inbound-ai-config';
import { resolveInboundSiteSlug } from './inbound-site';
import { ingestClarify } from './ingest-clarify';
import { ingestCreateDrafts } from './ingest-create';
import { ingestReplace } from './ingest-replace';
import { collectInboundInventoryLive } from './collect-attachment-texts-live';
import { prepareInboundDraft } from './prepare-inbound-draft';
import type { ReceivedInboundEmail } from './receiving';
import {
	defaultCreateDraft,
	defaultFind,
	defaultLoadCategories,
	defaultRecord,
	inventoryEmailId,
	toCreateInput,
} from './process-received-deps';

function readDraftConfig(deps: InboundEmailDeps): InboundDraftConfig | null {
	return deps.draftConfig !== undefined ? deps.draftConfig : inboundDraftConfig();
}

/** Po fetchu z Resend: jednostka, Grok, szkice / podmiana / pytanie, Telegram. */
export async function ingestFetchedInbound(
	event: { emailId: string; from: string; subject: string },
	email: ReceivedInboundEmail,
	deps: InboundEmailDeps = {},
): Promise<Response> {
	const draftConfig = readDraftConfig(deps);
	if (!draftConfig) return jsonOk({ ignored: true });

	const findInbound = deps.findInbound ?? defaultFind;
	const existing = await findInbound(event.emailId);
	if (existing) {
		return jsonOk({
			created: false,
			postId: existing.post_id,
			postIds: existing.post_id ? [existing.post_id] : [],
		});
	}

	const thread = await inventoryEmailId(event.emailId, email, findInbound);
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
		emailId: thread.emailId,
		shouldEnrich,
		collectInventory: deps.collectInventory ?? collectInboundInventoryLive,
		loadCategories: deps.loadCategories ?? defaultLoadCategories,
		enrich: deps.enrich ?? enrichInboundDraft,
	});

	const record = deps.recordInbound ?? defaultRecord;
	if (prepared.kind === 'clarify') {
		return ingestClarify({
			emailId: event.emailId,
			from: email.from || event.from,
			subject: email.subject || event.subject,
			question: prepared.question,
			sourceMessageId: thread.sourceMessageId,
			deps,
			record,
		});
	}
	if (prepared.kind === 'replace') {
		return ingestReplace({
			emailId: event.emailId,
			from: email.from || event.from,
			subject: email.subject || event.subject,
			siteSlug,
			replace: prepared,
			inventory: prepared.inventory,
			deps,
			record,
		});
	}

	return ingestCreateDrafts({
		create: (drafts) =>
			(deps.createDraft ?? defaultCreateDraft)(
				toCreateInput(event, email, siteSlug, draftConfig.fallbackAuthorId, drafts),
			),
		drafts: prepared.drafts,
		inventory: prepared.inventory,
		emailId: thread.emailId,
		deps,
	});
}
