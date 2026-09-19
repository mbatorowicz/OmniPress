import type { AttachmentDisplay } from './attachment-display';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { EnrichAttachment } from './enrich-model';

export type AttachmentDecision = {
	postId: string;
	display: AttachmentDisplay;
};

export function buildAttachmentDecisions(
	drafts: { attachments: EnrichAttachment[] }[],
	postIds: string[],
	inventory: InboundFileInventory[],
): Map<string, AttachmentDecision> {
	const map = new Map<string, AttachmentDecision>();
	drafts.forEach((draft, index) => {
		const postId = postIds[index];
		if (!postId) return;
		for (const att of draft.attachments) {
			map.set(att.filename, { postId, display: att.display });
		}
	});
	const fallbackPostId = postIds[0];
	if (!fallbackPostId) return map;
	for (const row of inventory) {
		if (map.has(row.filename)) continue;
		map.set(row.filename, { postId: fallbackPostId, display: row.suggestedDisplay });
	}
	return map;
}
