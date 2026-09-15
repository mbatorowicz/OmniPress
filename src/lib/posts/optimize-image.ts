import sharp from 'sharp';
import {
	IMAGE_MAX_EDGE,
	IMAGE_WEBP_QUALITY,
	shouldOptimizeImage,
} from './optimize-image-model';

export type OptimizeImageResult = {
	bytes: Uint8Array;
	mime: string;
	changed: boolean;
};

function unchanged(input: Uint8Array, mime: string): OptimizeImageResult {
	return { bytes: input, mime, changed: false };
}

/** JPEG/PNG/WebP → max 1920 px, WebP, bez EXIF. GIF i animacje bez zmian. */
export async function optimizeImage(
	input: Uint8Array,
	mime: string,
): Promise<OptimizeImageResult> {
	if (!shouldOptimizeImage(mime) || input.byteLength === 0) {
		return unchanged(input, mime);
	}

	try {
		const image = sharp(input, { failOn: 'none' }).rotate();
		const meta = await image.metadata();
		if ((meta.pages ?? 1) > 1) return unchanged(input, mime);

		const width = meta.width ?? 0;
		const height = meta.height ?? 0;
		const needsResize = Math.max(width, height) > IMAGE_MAX_EDGE;
		if (mime === 'image/webp' && !needsResize) return unchanged(input, mime);

		const out = await image
			.resize({
				width: IMAGE_MAX_EDGE,
				height: IMAGE_MAX_EDGE,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.webp({ quality: IMAGE_WEBP_QUALITY, effort: 4 })
			.toBuffer();

		if (out.byteLength >= input.byteLength && !needsResize) {
			return unchanged(input, mime);
		}

		return { bytes: new Uint8Array(out), mime: 'image/webp', changed: true };
	} catch {
		return unchanged(input, mime);
	}
}
