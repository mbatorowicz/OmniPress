import type { InboundAiFilePart } from './vision-model';
import { rasterPdfPages } from './vision-pdf-raster';

/** Strony PDF jako JPEG. Native PDF nie idzie do Gateway — 400. */
export async function visionPdfParts(
	filename: string,
	bytes: Uint8Array,
): Promise<InboundAiFilePart[]> {
	return rasterPdfPages(filename, bytes);
}

export async function visionPdfPart(
	filename: string,
	bytes: Uint8Array,
): Promise<InboundAiFilePart | null> {
	const parts = await visionPdfParts(filename, bytes);
	return parts[0] ?? null;
}
