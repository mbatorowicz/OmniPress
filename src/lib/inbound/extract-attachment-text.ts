import { DOCX_MIME, PDF_MIME } from '@/lib/posts/upload-mime';
import { extractDocxText } from './extract-docx-text';
import { extractPdfMeta } from './extract-pdf-text';

export type ExtractedAttachmentText = {
	filename: string;
	mime: string;
	text: string;
	pageCount: number | null;
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
	if (mime === PDF_MIME) {
		const meta = await extractPdfMeta(bytes);
		return { filename, mime, text: meta.text, pageCount: meta.pageCount };
	}
	return { filename, mime, text: await extractDocxText(bytes), pageCount: null };
}
