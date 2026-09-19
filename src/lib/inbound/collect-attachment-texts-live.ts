import { collectInboundInventory, type InboundFileInventory } from './collect-attachment-texts';
import { inboundResendApiKey } from './receiving';
import { downloadReceivedAttachment, listReceivedAttachments } from './receiving-attachments';

export async function collectInboundInventoryLive(emailId: string): Promise<InboundFileInventory[]> {
	const apiKey = inboundResendApiKey();
	const id = emailId.trim();
	if (!apiKey || !id) return [];
	return collectInboundInventory({
		emailId: id,
		list: (rowId) => listReceivedAttachments(rowId, { apiKey }),
		download: (url, maxBytes) => downloadReceivedAttachment(url, { maxBytes }),
	});
}

export const collectExtractableAttachmentTextsLive = collectInboundInventoryLive;
