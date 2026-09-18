import { inbound } from '@/i18n';
import { MAX_FILE_ATTACHMENT_BYTES, MAX_IMAGE_BYTES } from '@/lib/posts/upload-mime';
import { decideAttachmentBytes, decideAttachmentMeta } from './attachment-decide';
import {
	inboundAttachmentFilename,
	splitAttachmentLimit,
	type InboundAttachmentMeta,
} from './attachment-model';
import { appendAttachmentNotes, attachmentSkipNote, overflowSkipNote } from './attachment-notes';
import type { DownloadAttachmentResult } from './receiving-attachments';
import type { StoreInboundAttachmentInput } from './store-attachment';

export type ApplyInboundAttachmentsInput = {
	postId: string;
	emailId: string;
	contentMd: string;
	list: (emailId: string) => Promise<InboundAttachmentMeta[] | null>;
	download: (url: string, maxBytes: number) => Promise<DownloadAttachmentResult>;
	store: (input: StoreInboundAttachmentInput) => Promise<boolean>;
	saveContent: (postId: string, contentMd: string) => Promise<void>;
};

export type ApplyInboundAttachmentsResult = { stored: number; notes: string[] };

function maxBytesForMime(mime: string): number {
	return mime.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_FILE_ATTACHMENT_BYTES;
}

async function persistNotes(
	input: ApplyInboundAttachmentsInput,
	notes: string[],
): Promise<void> {
	if (notes.length === 0) return;
	try {
		await input.saveContent(input.postId, appendAttachmentNotes(input.contentMd, notes));
	} catch {
		// Szkic zostaje bez notatki.
	}
}

async function applyListed(
	input: ApplyInboundAttachmentsInput,
	listed: InboundAttachmentMeta[],
): Promise<ApplyInboundAttachmentsResult> {
	const notes: string[] = [];
	const { accepted, overflow } = splitAttachmentLimit(listed);
	if (overflow.length > 0) {
		const first = overflow[0]!;
		notes.push(
			overflowSkipNote(
				overflow.length,
				inboundAttachmentFilename(first.filename, first.contentType),
			),
		);
	}

	let stored = 0;
	for (const item of accepted) {
		const pre = decideAttachmentMeta(item);
		if (pre.action === 'skip') {
			notes.push(attachmentSkipNote(pre.filename, pre.reason));
			continue;
		}
		let downloaded: DownloadAttachmentResult;
		try {
			downloaded = await input.download(item.downloadUrl, maxBytesForMime(pre.mime));
		} catch {
			downloaded = { ok: false, reason: 'fetch_failed' };
		}
		if (!downloaded.ok) {
			notes.push(attachmentSkipNote(pre.filename, downloaded.reason));
			continue;
		}
		const decided = decideAttachmentBytes(pre, downloaded.bytes);
		if (decided.action === 'skip') {
			notes.push(attachmentSkipNote(decided.filename, decided.reason));
			continue;
		}
		const ok = await input.store({
			postId: input.postId,
			filename: decided.filename,
			mime: decided.mime,
			kind: decided.kind,
			bytes: downloaded.bytes,
		});
		if (ok) stored += 1;
		else notes.push(attachmentSkipNote(decided.filename, 'store_failed'));
	}

	await persistNotes(input, notes);
	return { stored, notes };
}

/** Zly plik / fail fetch nie rzuca — szkic zostaje. */
export async function applyInboundAttachments(
	input: ApplyInboundAttachmentsInput,
): Promise<ApplyInboundAttachmentsResult> {
	try {
		let listed: InboundAttachmentMeta[] | null;
		try {
			listed = await input.list(input.emailId);
		} catch {
			listed = null;
		}
		if (!listed) {
			const notes = [inbound.skippedList];
			await persistNotes(input, notes);
			return { stored: 0, notes };
		}
		return await applyListed(input, listed);
	} catch {
		return { stored: 0, notes: [] };
	}
}
