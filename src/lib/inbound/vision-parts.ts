import { extractDocxMedia } from './extract-docx-media';
import { compressVisionImage } from './vision-compress';
import {
	fitsVisionBudget,
	isVisionDocxMime,
	isVisionImageMime,
	isVisionPdfMime,
	type InboundAiFilePart,
} from './vision-model';
import { visionPdfPart } from './vision-pdf';
import type { InboundFileInventory } from './collect-attachment-texts';

async function partsFromDocx(filename: string, bytes: Uint8Array): Promise<InboundAiFilePart[]> {
	const media = await extractDocxMedia(bytes);
	const out: InboundAiFilePart[] = [];
	for (const file of media) {
		if (!isVisionImageMime(file.mime)) continue;
		const part = await compressVisionImage(`${filename}:${file.name}`, file.mime, file.bytes);
		if (part) out.push(part);
	}
	return out;
}

async function partsFromRow(row: InboundFileInventory): Promise<InboundAiFilePart[]> {
	const bytes = row.bytes;
	if (!bytes || bytes.byteLength === 0) return [];
	if (isVisionImageMime(row.mime)) {
		const part = await compressVisionImage(row.filename, row.mime, bytes);
		return part ? [part] : [];
	}
	if (isVisionPdfMime(row.mime)) {
		const part = await visionPdfPart(row.filename, bytes);
		return part ? [part] : [];
	}
	if (isVisionDocxMime(row.mime)) return partsFromDocx(row.filename, bytes);
	return [];
}

/** Obrazy, PDF i grafiki z DOCX. XLSX/ZIP/GPKG zostają tylko w tekście promptu. */
export async function buildInboundVisionParts(
	attachments: InboundFileInventory[],
): Promise<InboundAiFilePart[]> {
	const out: InboundAiFilePart[] = [];
	let used = 0;
	for (const row of attachments) {
		const parts = await partsFromRow(row);
		for (const part of parts) {
			if (!fitsVisionBudget(used, part.data.byteLength)) continue;
			out.push(part);
			used += part.data.byteLength;
		}
	}
	return out;
}
