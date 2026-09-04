import { DOWNLOAD_FILE_MIMES, DOCX_MIME, GPKG_MIME, PDF_MIME, XLSX_MIME, ZIP_MIME, type UploadKind } from './upload-mime';

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
		case XLSX_MIME:
			return 'xlsx';
		case ZIP_MIME:
			return 'zip';
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
	if (mime === DOCX_MIME || DOWNLOAD_FILE_MIMES.has(mime)) {
		return `[📎 ${filename}](${publicUrl})`;
	}
	return `![${filename}](${publicUrl})`;
}

export function parseUploadKind(raw: string): UploadKind | null {
	if (raw === 'gallery' || raw === 'pdf' || raw === 'docx' || raw === 'file') return raw;
	if (raw === 'gpkg') return 'file';
	return null;
}
