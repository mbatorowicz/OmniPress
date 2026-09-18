import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { applyInboundAttachments } from './apply-attachments';
import { inboundResendApiKey } from './receiving';
import { downloadReceivedAttachment, listReceivedAttachments } from './receiving-attachments';
import { saveInboundDraftContent, storeInboundAttachment } from './store-attachment';

export async function applyInboundAttachmentsLive(input: {
	postId: string;
	emailId: string;
	contentMd: string;
}): Promise<void> {
	if (!isServiceSupabaseConfigured()) return;
	const apiKey = inboundResendApiKey();
	if (!apiKey) return;
	const supabase = createServiceSupabase();
	try {
		await applyInboundAttachments({
			postId: input.postId,
			emailId: input.emailId,
			contentMd: input.contentMd,
			list: (emailId) => listReceivedAttachments(emailId, { apiKey }),
			download: (url, maxBytes) => downloadReceivedAttachment(url, { maxBytes }),
			store: (row) => storeInboundAttachment(supabase, row),
			saveContent: (postId, contentMd) => saveInboundDraftContent(supabase, postId, contentMd),
		});
	} catch {
		// Zalacznik nie cofa szkicu.
	}
}
