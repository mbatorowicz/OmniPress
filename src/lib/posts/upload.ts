import { posts } from '@/i18n';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const PDF_MIME = 'application/pdf';
export const DOCX_MIME =
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const GPKG_MIME = 'application/geopackage+sqlite3';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_ATTACHMENT_BYTES = 50 * 1024 * 1024;

const SQLITE_MAGIC = 'SQLite format 3';

export type UploadKind = 'gallery' | 'pdf' | 'docx' | 'file';

export function resolveUploadMime(filename: string, declaredType: string): string | null {
	const lower = filename.toLowerCase();
	const declared = declaredType.trim().toLowerCase();

	if (lower.endsWith('.gpkg')) {
		if (
			!declared ||
			declared === 'application/octet-stream' ||
			declared === GPKG_MIME ||
			declared === 'application/x-sqlite3'
		) {
			return GPKG_MIME;
		}
		return null;
	}

	if (IMAGE_MIME.has(declared) || declared === PDF_MIME || declared === DOCX_MIME) {
		return declared;
	}

	return null;
}

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
	if (mime === GPKG_MIME) {
		if (bytes.length < 16) return false;
		const header = String.fromCharCode(...bytes.subarray(0, 15));
		return header === SQLITE_MAGIC && bytes[15] === 0;
	}
	return false;
}

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
	if (kind === 'file' && mime !== GPKG_MIME) {
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
		case GPKG_MIME:
			return 'gpkg';
		default:
			return 'bin';
	}
}

export function markdownForUploadedAsset(filename: string, publicUrl: string, mime: string): string {
	if (mime === PDF_MIME) {
		return `[📄 ${filename}](${publicUrl})`;
	}
	if (mime === DOCX_MIME || mime === GPKG_MIME) {
		return `[📎 ${filename}](${publicUrl})`;
	}
	return `![${filename}](${publicUrl})`;
}

export function parseUploadKind(raw: string): UploadKind | null {
	if (raw === 'gallery' || raw === 'pdf' || raw === 'docx' || raw === 'file') return raw;
	if (raw === 'gpkg') return 'file';
	return null;
}

export function validateMagicBytesForMime(bytes: Uint8Array, mime: string): boolean {
	return matchesMagicBytes(bytes, mime);
}

/** Testy jednostkowe — weryfikacja magic bytes bez File API. */
export function matchesPostAssetMagicBytes(bytes: Uint8Array, mime: string): boolean {
	return matchesMagicBytes(bytes, mime);
}
