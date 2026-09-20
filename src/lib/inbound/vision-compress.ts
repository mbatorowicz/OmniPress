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

function jpegName(filename: string): string {
	return filename.replace(/\.[a-z0-9]+$/i, '.jpg');
}

/** JPEG/PNG/WebP → krawędź 1280 px (miniatura). GIF → pierwsza klatka JPEG. */
export async function compressVisionImage(
	filename: string,
	mime: string,
	bytes: Uint8Array,
): Promise<InboundAiFilePart | null> {
	if (!isVisionImageMime(mime) || bytes.byteLength === 0) return null;
	const forceJpeg = mime === 'image/gif';

	try {
		const image = sharp(bytes, { failOn: 'none', pages: 1, page: 0 }).rotate();
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
		if (forceJpeg) return asPart(jpegName(filename), 'image/jpeg', data);
		if (data.byteLength > 0 && data.byteLength < bytes.byteLength) {
			return asPart(jpegName(filename), 'image/jpeg', data);
		}
		return asPart(filename, mime, bytes);
	} catch {
		return forceJpeg ? null : asPart(filename, mime, bytes);
	}
}
