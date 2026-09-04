export const PDF_MIME = 'application/pdf';
export const DOCX_MIME =
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const XLSX_MIME =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const ZIP_MIME = 'application/zip';
export const GPKG_MIME = 'application/geopackage+sqlite3';

export const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/** Pliki w panelu „Pliki do pobrania” (poza PDF/DOCX). */
export const DOWNLOAD_FILE_MIMES = new Set([GPKG_MIME, XLSX_MIME, ZIP_MIME]);

export type UploadKind = 'gallery' | 'pdf' | 'docx' | 'file';

export function normalizeDeclaredZipMime(declared: string): boolean {
	return (
		!declared ||
		declared === 'application/octet-stream' ||
		declared === ZIP_MIME ||
		declared === 'application/x-zip-compressed'
	);
}

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

	if (lower.endsWith('.xlsx')) {
		if (
			!declared ||
			declared === 'application/octet-stream' ||
			declared === XLSX_MIME
		) {
			return XLSX_MIME;
		}
		return null;
	}

	if (lower.endsWith('.zip')) {
		if (normalizeDeclaredZipMime(declared)) {
			return ZIP_MIME;
		}
		return null;
	}

	if (IMAGE_MIME.has(declared) || declared === PDF_MIME || declared === DOCX_MIME) {
		return declared;
	}

	return null;
}
