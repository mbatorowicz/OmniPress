import { posts } from '@/i18n';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validateImageFile(file: File): string | null {
	if (!ALLOWED_MIME.has(file.type)) {
		return posts.upload.invalidMime;
	}
	if (file.size > 10 * 1024 * 1024) {
		return posts.upload.tooLarge;
	}
	return null;
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
		default:
			return 'bin';
	}
}
