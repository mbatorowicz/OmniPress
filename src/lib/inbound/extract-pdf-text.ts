import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { clipText } from './extract-clip';

const MAX_PAGES = 8;
const require = createRequire(import.meta.url);

let workerSrc: string | null = null;

function pdfWorkerSrc(): string {
	if (workerSrc) return workerSrc;
	workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
	return workerSrc;
}

function itemText(item: unknown): string {
	if (!item || typeof item !== 'object') return '';
	const str = (item as { str?: unknown }).str;
	return typeof str === 'string' ? str : '';
}

async function closePdf(doc: { cleanup?: () => Promise<unknown> | unknown }): Promise<void> {
	try {
		await doc.cleanup?.();
	} catch {
		// Dokument i tak wychodzi z scope.
	}
}

/** Warstwa tekstowa PDF (bez OCR). Pusty string przy skanie / błędzie. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
	if (bytes.byteLength === 0) return '';
	try {
		const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
		pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc();
		const task = pdfjs.getDocument({
			data: bytes.slice(),
			disableFontFace: true,
			useSystemFonts: true,
			verbosity: 0,
		});
		const doc = await task.promise;
		try {
			const pages: string[] = [];
			const last = Math.min(doc.numPages, MAX_PAGES);
			for (let n = 1; n <= last; n += 1) {
				const page = await doc.getPage(n);
				const content = await page.getTextContent();
				const line = content.items.map(itemText).filter(Boolean).join(' ');
				if (line.trim()) pages.push(line);
			}
			return clipText(pages.join('\n'));
		} finally {
			await closePdf(doc);
		}
	} catch {
		return '';
	}
}
