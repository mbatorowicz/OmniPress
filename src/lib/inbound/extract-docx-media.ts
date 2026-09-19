import JSZip from 'jszip';
import { mimeForDocxMediaName } from './docx-media-model';

export type ExtractedDocxMedia = {
	name: string;
	mime: string;
	bytes: Uint8Array;
};

const MEDIA_PATH = /^word\/media\/([^/]+)$/i;

/** Raster i wektory z `word/media`. Pusta tablica przy uszkodzonym ZIP. */
export async function extractDocxMedia(bytes: Uint8Array): Promise<ExtractedDocxMedia[]> {
	if (bytes.byteLength === 0) return [];
	try {
		const zip = await JSZip.loadAsync(bytes);
		const out: ExtractedDocxMedia[] = [];
		for (const [path, entry] of Object.entries(zip.files)) {
			if (entry.dir) continue;
			const match = path.match(MEDIA_PATH);
			if (!match) continue;
			const name = match[1] ?? '';
			const mime = mimeForDocxMediaName(name);
			if (!mime) continue;
			const buf = await entry.async('uint8array');
			if (buf.byteLength === 0) continue;
			out.push({ name, mime, bytes: buf });
		}
		return out;
	} catch {
		return [];
	}
}
