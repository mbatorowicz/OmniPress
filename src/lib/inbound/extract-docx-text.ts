import mammoth from 'mammoth';
import { clipText } from './extract-clip';

/** Surowy tekst DOCX. Pusty string przy uszkodzonym pliku. */
export async function extractDocxText(bytes: Uint8Array): Promise<string> {
	if (bytes.byteLength === 0) return '';
	try {
		const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
		return clipText(result.value ?? '');
	} catch {
		return '';
	}
}
