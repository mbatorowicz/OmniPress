import { posts } from '@/i18n';
import { matchesMagicBytes } from '@/lib/posts/upload-magic';
import type { UploadKind } from '@/lib/posts/upload-mime';
import { validateUploadMeta } from '@/lib/posts/upload-validate';
import {
	inboundAttachmentFilename,
	kindForUploadMime,
	resolveInboundMime,
	type InboundAttachmentMeta,
} from './attachment-model';

export type AttachmentSkipReason =
	| 'too_large'
	| 'invalid_type'
	| 'invalid_content'
	| 'fetch_failed'
	| 'over_limit'
	| 'store_failed';

export type InboundAttachmentDecision =
	| { action: 'skip'; reason: AttachmentSkipReason; filename: string }
	| { action: 'store'; filename: string; mime: string; kind: UploadKind };

function skipReasonFromMetaError(error: string): AttachmentSkipReason {
	if (error === posts.upload.tooLarge || error === posts.upload.fileTooLarge) return 'too_large';
	return 'invalid_type';
}

/** Przed fetch: MIME i zadeklarowany rozmiar — ten sam validateUploadMeta co panel. */
export function decideAttachmentMeta(meta: InboundAttachmentMeta): InboundAttachmentDecision {
	const filename = inboundAttachmentFilename(meta.filename, meta.contentType);
	const mime = resolveInboundMime(filename, meta.contentType);
	if (!mime) return { action: 'skip', reason: 'invalid_type', filename };
	const kind = kindForUploadMime(mime);
	if (!kind) return { action: 'skip', reason: 'invalid_type', filename };
	const checked = validateUploadMeta(kind, filename, meta.size, mime);
	if ('error' in checked) {
		return { action: 'skip', reason: skipReasonFromMetaError(checked.error), filename };
	}
	return { action: 'store', filename, mime: checked.mime, kind };
}

/** Po fetch: faktyczny rozmiar + magic bytes. Brak bajtow = fail fetch, nie 5xx. */
export function decideAttachmentBytes(
	pending: Extract<InboundAttachmentDecision, { action: 'store' }>,
	bytes: Uint8Array | null,
): InboundAttachmentDecision {
	if (!bytes || bytes.byteLength === 0) {
		return { action: 'skip', reason: 'fetch_failed', filename: pending.filename };
	}
	const checked = validateUploadMeta(pending.kind, pending.filename, bytes.byteLength, pending.mime);
	if ('error' in checked) {
		return {
			action: 'skip',
			reason: skipReasonFromMetaError(checked.error),
			filename: pending.filename,
		};
	}
	if (!matchesMagicBytes(bytes, pending.mime)) {
		return { action: 'skip', reason: 'invalid_content', filename: pending.filename };
	}
	return pending;
}
