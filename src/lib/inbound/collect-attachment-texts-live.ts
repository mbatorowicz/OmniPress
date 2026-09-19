import { collectExtractableAttachmentTexts } from './collect-attachment-texts';
import type { ExtractedAttachmentText } from './extract-attachment-text';
import { inboundResendApiKey } from './receiving';
import { downloadReceivedAttachment, listReceivedAttachments } from './receiving-attachments';

export async function collectExtractableAttachmentTextsLive(
	emailId: string,
): Promise<ExtractedAttachmentText[]> {
	const apiKey = inboundResendApiKey();
	const id = emailId.trim();
	if (!apiKey || !id) return [];
	return collectExtractableAttachmentTexts({
		emailId: id,
		list: (rowId) => listReceivedAttachments(rowId, { apiKey }),
		download: (url, maxBytes) => downloadReceivedAttachment(url, { maxBytes }),
	});
}
