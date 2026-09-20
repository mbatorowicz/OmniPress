import { MAX_FILE_ATTACHMENT_BYTES } from '@/lib/posts/upload-mime';
import { applyCoverLetterDrops, suggestAttachmentDisplay, type AttachmentDisplay } from './attachment-display';
import { decideAttachmentBytes, decideAttachmentMeta } from './attachment-decide';
import { splitAttachmentLimit, type InboundAttachmentMeta } from './attachment-model';
import {
	extractAttachmentText,
	isExtractableMime,
	type ExtractedAttachmentText,
} from './extract-attachment-text';
import type { DownloadAttachmentResult } from './receiving-attachments';

export type InboundFileInventory = ExtractedAttachmentText & {
	suggestedDisplay: AttachmentDisplay;
	/** Bajty do wizji Groka i podmiany. Brak = tylko metadane w promptcie. */
	bytes?: Uint8Array | null;
};

export type CollectAttachmentTextsInput = {
	emailId: string;
	list: (emailId: string) => Promise<InboundAttachmentMeta[] | null>;
	download: (url: string, maxBytes: number) => Promise<DownloadAttachmentResult>;
	extract?: typeof extractAttachmentText;
};

function rowFromExtracted(
	extracted: ExtractedAttachmentText,
	bytes: Uint8Array,
): InboundFileInventory {
	return {
		...extracted,
		suggestedDisplay: suggestAttachmentDisplay(extracted),
		bytes,
	};
}

function rowFromFile(filename: string, mime: string, bytes: Uint8Array): InboundFileInventory {
	const extracted = { filename, mime, text: '', pageCount: null };
	return { ...extracted, suggestedDisplay: suggestAttachmentDisplay(extracted), bytes };
}

/** Wszystkie przyjęte pliki — także PDF bez tekstu i obrazy. */
export async function collectInboundInventory(
	input: CollectAttachmentTextsInput,
): Promise<InboundFileInventory[]> {
	let listed: InboundAttachmentMeta[] | null;
	try {
		listed = await input.list(input.emailId);
	} catch {
		return [];
	}
	if (!listed) return [];

	const extract = input.extract ?? extractAttachmentText;
	const out: InboundFileInventory[] = [];
	const { accepted } = splitAttachmentLimit(listed);

	for (const item of accepted) {
		const pre = decideAttachmentMeta(item);
		if (pre.action === 'skip') continue;
		let downloaded: DownloadAttachmentResult;
		try {
			downloaded = await input.download(item.downloadUrl, MAX_FILE_ATTACHMENT_BYTES);
		} catch {
			continue;
		}
		if (!downloaded.ok) continue;
		const decided = decideAttachmentBytes(pre, downloaded.bytes);
		if (decided.action === 'skip') continue;
		if (isExtractableMime(decided.mime)) {
			const extracted = await extract(decided.filename, decided.mime, downloaded.bytes);
			if (extracted) out.push(rowFromExtracted(extracted, downloaded.bytes));
			else out.push(rowFromFile(decided.filename, decided.mime, downloaded.bytes));
			continue;
		}
		out.push(rowFromFile(decided.filename, decided.mime, downloaded.bytes));
	}
	return applyCoverLetterDrops(out);
}

export async function collectExtractableAttachmentTexts(
	input: CollectAttachmentTextsInput,
): Promise<ExtractedAttachmentText[]> {
	return collectInboundInventory(input);
}
