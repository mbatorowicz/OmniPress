import { IMAGE_MIME } from '@/lib/posts/upload-mime';

export type DocxMediaKind = 'content' | 'stamp' | 'signature' | 'vector' | 'tiny';

export type DocxMediaClassInput = {
	name: string;
	mime: string;
	byteLength: number;
	width: number;
	height: number;
};

const VECTOR_RE = /\.(emf|wmf)$/i;
const MIN_CONTENT_PIXELS = 80_000;
const MIN_CONTENT_BYTES = 12_000;

export function mimeForDocxMediaName(name: string): string | null {
	const lower = name.toLowerCase();
	if (lower.endsWith('.jpeg') || lower.endsWith('.jpg')) return 'image/jpeg';
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.gif')) return 'image/gif';
	if (lower.endsWith('.webp')) return 'image/webp';
	if (VECTOR_RE.test(lower)) return 'image/x-emf';
	return null;
}

export function classifyDocxMedia(input: DocxMediaClassInput): DocxMediaKind {
	if (input.mime === 'image/x-emf' || VECTOR_RE.test(input.name)) return 'vector';
	const { width: w, height: h, byteLength } = input;
	const pixels = w * h;
	if ((pixels > 0 && pixels < 8_000 && byteLength < 8_000) || byteLength < 2_000) {
		return 'tiny';
	}
	if (pixels >= MIN_CONTENT_PIXELS || (pixels === 0 && byteLength >= MIN_CONTENT_BYTES)) {
		return 'content';
	}
	if (h > 0 && h < 180 && w / h >= 2.5) return 'signature';
	const max = Math.max(w, h);
	const min = Math.min(w, h);
	if (min > 0 && max / min < 1.35 && max < 400 && byteLength < 80_000) return 'stamp';
	if (IMAGE_MIME.has(input.mime) && byteLength >= MIN_CONTENT_BYTES) return 'content';
	return 'tiny';
}

/** DOCX zostaje przy pieczęci / podpisie. Inaczej wystarczą wyciągnięte grafiki. */
export function shouldDropDocxAfterUnpack(kinds: readonly DocxMediaKind[]): boolean {
	const official = kinds.some((k) => k === 'vector' || k === 'stamp' || k === 'signature');
	const hasContent = kinds.some((k) => k === 'content');
	return hasContent && !official;
}

export function galleryFilenameFromDocx(docxFilename: string, index: number, mime: string): string {
	const base = docxFilename.replace(/\.docx$/i, '').trim() || 'grafika';
	const suffix = index === 0 ? '' : `-${index + 1}`;
	const ext =
		mime === 'image/jpeg'
			? 'jpg'
			: mime === 'image/png'
				? 'png'
				: mime === 'image/gif'
					? 'gif'
					: 'webp';
	return `${base}${suffix}.${ext}`;
}
