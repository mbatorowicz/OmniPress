import sharp from 'sharp';
import { PDF_MIME } from '@/lib/posts/upload-mime';
import {
	VISION_JPEG_QUALITY,
	VISION_MAX_EDGE,
	VISION_MAX_FILE_BYTES,
	type InboundAiFilePart,
} from './vision-model';

function pdfPart(filename: string, bytes: Uint8Array): InboundAiFilePart | null {
	if (bytes.byteLength === 0 || bytes.byteLength > VISION_MAX_FILE_BYTES) return null;
	return { filename, mediaType: PDF_MIME, data: bytes };
}

function rasterName(filename: string): string {
	return filename.replace(/\.pdf$/i, '') + '-p1.jpg';
}

/** Native PDF, gdy mieści się w limicie. Inaczej pierwsza strona (libvips) albo nic. */
export async function visionPdfPart(
	filename: string,
	bytes: Uint8Array,
): Promise<InboundAiFilePart | null> {
	const native = pdfPart(filename, bytes);
	if (native) return native;
	if (bytes.byteLength === 0) return null;
	try {
		const out = await sharp(bytes, { failOn: 'none', density: 120, page: 0 })
			.resize({
				width: VISION_MAX_EDGE,
				height: VISION_MAX_EDGE,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.jpeg({ quality: VISION_JPEG_QUALITY })
			.toBuffer();
		const data = new Uint8Array(out);
		if (data.byteLength === 0 || data.byteLength > VISION_MAX_FILE_BYTES) return null;
		return { filename: rasterName(filename), mediaType: 'image/jpeg', data };
	} catch {
		return null;
	}
}
