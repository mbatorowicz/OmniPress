import { posts } from '@/i18n';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const PDF_MIME = 'application/pdf';
export const DOCX_MIME =
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function matchesMagicBytes(bytes: Uint8Array, mime: string): boolean {
	if (mime === 'image/jpeg') {
		return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	}
	if (mime === 'image/png') {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47
		);
	}
	if (mime === 'image/gif') {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x47 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x38
		);
	}
	if (mime === 'image/webp') {
		return (
			bytes.length >= 12 &&
			bytes[0] === 0x52 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x46 &&
			bytes[8] === 0x57 &&
			bytes[9] === 0x45 &&
			bytes[10] === 0x42 &&
			bytes[11] === 0x50
		);
	}
	if (mime === PDF_MIME) {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x25 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x44 &&
			bytes[3] === 0x46
		);
	}
	if (mime === DOCX_MIME) {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x50 &&
			bytes[1] === 0x4b &&
			bytes[2] === 0x03 &&
			bytes[3] === 0x04
		);
	}
	return false;
}

export async function validatePostAssetFile(file: File): Promise<string | null> {
	if (IMAGE_MIME.has(file.type)) {
		if (file.size > MAX_IMAGE_BYTES) return posts.upload.tooLarge;
	} else if (file.type === PDF_MIME || file.type === DOCX_MIME) {
		if (file.size > MAX_FILE_ATTACHMENT_BYTES) return posts.upload.fileTooLarge;
	} else {
		return posts.upload.invalidMime;
	}

	const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
	if (!matchesMagicBytes(head, file.type)) {
		return posts.upload.invalidContent;
	}

	return null;
}

/** @deprecated użyj validatePostAssetFile */
export async function validateImageFile(file: File): Promise<string | null> {
	return validatePostAssetFile(file);
}

export function extensionForMime(mime: string): string {
	switch (mime) {
		case 'image/jpeg':
			return 'jpg';
		case 'image/png':
			return 'png';
		case 'image/webp':
			return 'webp';
		case 'image/gif':
			return 'gif';
		case PDF_MIME:
			return 'pdf';
		case DOCX_MIME:
			return 'docx';
		default:
			return 'bin';
	}
}

export function markdownForUploadedAsset(filename: string, publicUrl: string, mime: string): string {
	if (mime === PDF_MIME) {
		return `[📄 ${filename}](${publicUrl})`;
	}
	if (mime === DOCX_MIME) {
		return `[📎 ${filename}](${publicUrl})`;
	}
	return `![${filename}](${publicUrl})`;
}

/** Testy jednostkowe — weryfikacja magic bytes bez File API. */
export function matchesPostAssetMagicBytes(bytes: Uint8Array, mime: string): boolean {
	return matchesMagicBytes(bytes, mime);
}
