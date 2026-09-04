import { posts } from '@/i18n';
import { matchesMagicBytes } from './upload-magic';
import {
	DOWNLOAD_FILE_MIMES,
	DOCX_MIME,
	MAX_FILE_ATTACHMENT_BYTES,
	MAX_IMAGE_BYTES,
	PDF_MIME,
	resolveUploadMime,
	type UploadKind,
} from './upload-mime';

export function validateUploadMeta(
	kind: UploadKind,
	filename: string,
	size: number,
	declaredType: string,
): { mime: string } | { error: string } {
	const mime = resolveUploadMime(filename, declaredType);
	if (!mime) return { error: posts.upload.invalidMime };

	if (kind === 'gallery' && !mime.startsWith('image/')) {
		return { error: posts.upload.invalidMime };
	}
	if (kind === 'pdf' && mime !== PDF_MIME) {
		return { error: posts.upload.invalidMime };
	}
	if (kind === 'docx' && mime !== DOCX_MIME) {
		return { error: posts.upload.invalidMime };
	}
	if (kind === 'file' && !DOWNLOAD_FILE_MIMES.has(mime)) {
		return { error: posts.upload.invalidMime };
	}

	if (mime.startsWith('image/')) {
		if (size > MAX_IMAGE_BYTES) return { error: posts.upload.tooLarge };
	} else if (size > MAX_FILE_ATTACHMENT_BYTES) {
		return { error: posts.upload.fileTooLarge };
	}

	return { mime };
}

export async function validatePostAssetFile(file: File): Promise<string | null> {
	const mime = resolveUploadMime(file.name, file.type);
	if (!mime) return posts.upload.invalidMime;

	if (mime.startsWith('image/')) {
		if (file.size > MAX_IMAGE_BYTES) return posts.upload.tooLarge;
	} else if (file.size > MAX_FILE_ATTACHMENT_BYTES) {
		return posts.upload.fileTooLarge;
	}

	const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
	if (!matchesMagicBytes(head, mime)) {
		return posts.upload.invalidContent;
	}

	return null;
}

/** @deprecated użyj validatePostAssetFile */
export async function validateImageFile(file: File): Promise<string | null> {
	return validatePostAssetFile(file);
}
