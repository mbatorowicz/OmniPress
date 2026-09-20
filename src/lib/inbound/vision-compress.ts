import sharp from 'sharp';
import {
	VISION_JPEG_QUALITY,
	VISION_MAX_EDGE,
	VISION_MAX_FILE_BYTES,
	isVisionImageMime,
	type InboundAiFilePart,
} from './vision-model';

function asPart(filename: string, mediaType: string, data: Uint8Array): InboundAiFilePart | null {
	if (data.byteLength === 0 || data.byteLength > VISION_MAX_FILE_BYTES) return null;
	return { filename, mediaType, data };
}

/** JPEG/PNG/WebP → krawędź 1600 px. GIF bez zmian, gdy mieści się w limicie. */
export async function compressVisionImage(
	filename: string,
	mime: string,
	bytes: Uint8Array,
): Promise<InboundAiFilePart | null> {
	if (!isVisionImageMime(mime) || bytes.byteLength === 0) return null;
	if (mime === 'image/gif') return asPart(filename, mime, bytes);

	try {
		const image = sharp(bytes, { failOn: 'none' }).rotate();
		const meta = await image.metadata();
		if ((meta.pages ?? 1) > 1) return asPart(filename, mime, bytes);

		const out = await image
			.resize({
				width: VISION_MAX_EDGE,
				height: VISION_MAX_EDGE,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.jpeg({ quality: VISION_JPEG_QUALITY, mozjpeg: true })
			.toBuffer();
		const data = new Uint8Array(out);
		if (data.byteLength > 0 && data.byteLength < bytes.byteLength) {
			return asPart(filename.replace(/\.[a-z0-9]+$/i, '.jpg'), 'image/jpeg', data);
		}
		return asPart(filename, mime, bytes);
	} catch {
		return asPart(filename, mime, bytes);
	}
}
