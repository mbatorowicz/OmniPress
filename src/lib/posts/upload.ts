import { posts } from '@/i18n';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PDF_MIME = 'application/pdf';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 15 * 1024 * 1024;

export function validatePostAssetFile(file: File): string | null {
	if (IMAGE_MIME.has(file.type)) {
		if (file.size > MAX_IMAGE_BYTES) return posts.upload.tooLarge;
		return null;
	}
	if (file.type === PDF_MIME) {
		if (file.size > MAX_PDF_BYTES) return posts.upload.pdfTooLarge;
		return null;
	}
	return posts.upload.invalidMime;
}

/** @deprecated użyj validatePostAssetFile */
export function validateImageFile(file: File): string | null {
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
		default:
			return 'bin';
	}
}

export function markdownForUploadedAsset(filename: string, publicUrl: string, mime: string): string {
	if (mime === PDF_MIME) {
		return `[📄 ${filename}](${publicUrl})`;
	}
	return `![${filename}](${publicUrl})`;
}
