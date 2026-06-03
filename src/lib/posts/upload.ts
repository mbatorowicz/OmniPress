const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validateImageFile(file: File): string | null {
	if (!ALLOWED_MIME.has(file.type)) {
		return 'Dozwolone formaty: JPEG, PNG, WebP, GIF.';
	}
	if (file.size > 10 * 1024 * 1024) {
		return 'Plik jest za duży (max 10 MB).';
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
