import { MAX_FILE_ATTACHMENT_BYTES } from '@/lib/posts/upload-mime';
import { decideAttachmentBytes, decideAttachmentMeta } from './attachment-decide';
import { splitAttachmentLimit, type InboundAttachmentMeta } from './attachment-model';
import {
	extractAttachmentText,
	isExtractableMime,
	type ExtractedAttachmentText,
} from './extract-attachment-text';
import type { DownloadAttachmentResult } from './receiving-attachments';

export type CollectAttachmentTextsInput = {
	emailId: string;
	list: (emailId: string) => Promise<InboundAttachmentMeta[] | null>;
	download: (url: string, maxBytes: number) => Promise<DownloadAttachmentResult>;
	extract?: typeof extractAttachmentText;
};

/** Pobiera PDF/DOCX z Resend i wyciąga tekst — przed insertem szkicu. */
export async function collectExtractableAttachmentTexts(
	input: CollectAttachmentTextsInput,
): Promise<ExtractedAttachmentText[]> {
	let listed: InboundAttachmentMeta[] | null;
	try {
		listed = await input.list(input.emailId);
	} catch {
		return [];
	}
	if (!listed) return [];

	const extract = input.extract ?? extractAttachmentText;
	const out: ExtractedAttachmentText[] = [];
	const { accepted } = splitAttachmentLimit(listed);

	for (const item of accepted) {
		const pre = decideAttachmentMeta(item);
		if (pre.action === 'skip' || !isExtractableMime(pre.mime)) continue;
		let downloaded: DownloadAttachmentResult;
		try {
			downloaded = await input.download(item.downloadUrl, MAX_FILE_ATTACHMENT_BYTES);
		} catch {
			continue;
		}
		if (!downloaded.ok) continue;
		const decided = decideAttachmentBytes(pre, downloaded.bytes);
		if (decided.action === 'skip') continue;
		const extracted = await extract(decided.filename, decided.mime, downloaded.bytes);
		if (extracted) out.push(extracted);
	}
	return out;
}
