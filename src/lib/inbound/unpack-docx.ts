import sharp from 'sharp';
import { sanitizeAssetFilename } from '@/lib/posts/asset-filename';
import { optimizeImage } from '@/lib/posts/optimize-image';
import { IMAGE_MIME } from '@/lib/posts/upload-mime';
import {
	classifyDocxMedia,
	galleryFilenameFromDocx,
	shouldDropDocxAfterUnpack,
	type DocxMediaKind,
} from './docx-media-model';
import { extractDocxMedia, type ExtractedDocxMedia } from './extract-docx-media';

export type UnpackedInboundImage = {
	filename: string;
	mime: string;
	bytes: Uint8Array;
};

export type UnpackDocxResult = {
	dropDocx: boolean;
	images: UnpackedInboundImage[];
};

export type UnpackDocxFn = (bytes: Uint8Array, sourceFilename: string) => Promise<UnpackDocxResult>;

async function imageSize(bytes: Uint8Array): Promise<{ width: number; height: number }> {
	try {
		const meta = await sharp(bytes, { failOn: 'none' }).metadata();
		return { width: meta.width ?? 0, height: meta.height ?? 0 };
	} catch {
		return { width: 0, height: 0 };
	}
}

async function toGalleryImage(
	file: ExtractedDocxMedia,
	docxFilename: string,
	index: number,
): Promise<UnpackedInboundImage> {
	const optimized = IMAGE_MIME.has(file.mime)
		? await optimizeImage(file.bytes, file.mime)
		: { bytes: file.bytes, mime: file.mime };
	const rawName = galleryFilenameFromDocx(docxFilename, index, optimized.mime);
	return {
		filename: sanitizeAssetFilename(rawName) ?? rawName,
		mime: optimized.mime,
		bytes: optimized.bytes,
	};
}

/** Grafiki treści → galeria (pierwsza = zajawka). Pieczęć/podpis zostawia DOCX. */
export async function unpackDocxForInbound(
	bytes: Uint8Array,
	sourceFilename: string,
): Promise<UnpackDocxResult> {
	const media = await extractDocxMedia(bytes);
	if (media.length === 0) return { dropDocx: false, images: [] };

	const kinds: DocxMediaKind[] = [];
	const content: ExtractedDocxMedia[] = [];
	for (const file of media) {
		const size = IMAGE_MIME.has(file.mime) ? await imageSize(file.bytes) : { width: 0, height: 0 };
		const kind = classifyDocxMedia({
			name: file.name,
			mime: file.mime,
			byteLength: file.bytes.byteLength,
			...size,
		});
		kinds.push(kind);
		if (kind === 'content') content.push(file);
	}

	const images = await Promise.all(
		content.map((file, index) => toGalleryImage(file, sourceFilename, index)),
	);
	return {
		dropDocx: shouldDropDocxAfterUnpack(kinds) && images.length > 0,
		images,
	};
}
