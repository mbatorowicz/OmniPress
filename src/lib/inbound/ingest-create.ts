import { jsonError, jsonOk } from '@/lib/api/response';
import { applyInboundAttachmentsLive } from './apply-attachments-live';
import { buildAttachmentDecisions } from './attachment-assign';
import type { CreateInboundDraftResult } from './create-draft';
import type { EnrichDraft } from './enrich-model';
import type { InboundEmailDeps } from './handle-deps';
import { notifyInboundDraft } from './notify-draft';
import type { InboundFileInventory } from './collect-attachment-texts';

export async function ingestCreateDrafts(input: {
	create: (drafts: EnrichDraft[]) => Promise<CreateInboundDraftResult>;
	drafts: EnrichDraft[];
	inventory: InboundFileInventory[];
	emailId: string;
	deps: InboundEmailDeps;
}): Promise<Response> {
	const result = await input.create(input.drafts);
	if (!result.ok) return jsonError(result.error, 500);
	if (result.created) {
		const decisions = buildAttachmentDecisions(input.drafts, result.postIds, input.inventory);
		await (input.deps.applyAttachments ?? applyInboundAttachmentsLive)({
			postId: result.postId,
			emailId: input.emailId,
			contentMd: input.drafts[0]?.contentMd ?? '',
			decisions,
		});
		for (const [index, draft] of input.drafts.entries()) {
			const postId = result.postIds[index] ?? result.postId;
			await (input.deps.notify ?? notifyInboundDraft)(postId, draft.title, { kind: 'draft' });
		}
	}
	return jsonOk({ postId: result.postId, postIds: result.postIds, created: result.created });
}
