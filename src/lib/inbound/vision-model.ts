import { DOCX_MIME, PDF_MIME } from '@/lib/posts/upload-mime';

export const VISION_MAX_EDGE = 1920;
export const VISION_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024;
export const VISION_JPEG_QUALITY = 85;
export const VISION_MAX_PDF_PAGES = 8;
export const VISION_MAX_IMAGE_PARTS = 16;

const VISION_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type InboundAiFilePart = {
	filename: string;
	mediaType: string;
	data: Uint8Array;
};

export function isVisionImageMime(mime: string): boolean {
	return VISION_IMAGE_MIME.has(mime.trim().toLowerCase());
}

export function isVisionPdfMime(mime: string): boolean {
	return mime.trim().toLowerCase() === PDF_MIME;
}

export function isVisionDocxMime(mime: string): boolean {
	return mime.trim().toLowerCase() === DOCX_MIME;
}

export function fitsVisionBudget(used: number, next: number, cap = VISION_MAX_TOTAL_BYTES): boolean {
	if (next <= 0 || next > VISION_MAX_FILE_BYTES) return false;
	return used + next <= cap;
}

export function canAddVisionPart(count: number, used: number, next: number): boolean {
	if (count >= VISION_MAX_IMAGE_PARTS) return false;
	return fitsVisionBudget(used, next);
}
