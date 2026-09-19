import { DOCX_MIME, PDF_MIME } from '@/lib/posts/upload-mime';
import { extractDocxText } from './extract-docx-text';
import { extractPdfText } from './extract-pdf-text';

export type ExtractedAttachmentText = {
	filename: string;
	mime: string;
	text: string;
};

export function isExtractableMime(mime: string): boolean {
	return mime === PDF_MIME || mime === DOCX_MIME;
}

export async function extractAttachmentText(
	filename: string,
	mime: string,
	bytes: Uint8Array,
): Promise<ExtractedAttachmentText | null> {
	if (!isExtractableMime(mime) || bytes.byteLength === 0) return null;
	const text = mime === PDF_MIME ? await extractPdfText(bytes) : await extractDocxText(bytes);
	if (!text) return null;
	return { filename, mime, text };
}
