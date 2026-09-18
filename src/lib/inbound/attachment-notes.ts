import { inbound } from '@/i18n';
import type { AttachmentSkipReason } from './attachment-decide';

export function attachmentSkipNote(filename: string, reason: AttachmentSkipReason): string {
	switch (reason) {
		case 'too_large':
			return inbound.skippedTooLarge(filename);
		case 'invalid_type':
			return inbound.skippedType(filename);
		case 'invalid_content':
			return inbound.skippedContent(filename);
		case 'fetch_failed':
			return inbound.skippedFetch(filename);
		case 'over_limit':
			return inbound.skippedLimit(filename);
		case 'store_failed':
			return inbound.skippedStore(filename);
	}
}

export function overflowSkipNote(count: number, filename: string): string {
	return count === 1 ? attachmentSkipNote(filename, 'over_limit') : inbound.skippedLimitMany(count);
}

export function appendAttachmentNotes(contentMd: string, notes: string[]): string {
	if (notes.length === 0) return contentMd;
	const block = notes.join('\n');
	const body = contentMd.trimEnd();
	return body ? `${body}\n\n${block}` : block;
}
