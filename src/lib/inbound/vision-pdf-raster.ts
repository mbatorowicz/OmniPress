import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
	VISION_JPEG_QUALITY,
	VISION_MAX_EDGE,
	VISION_MAX_FILE_BYTES,
	VISION_MAX_PDF_PAGES,
	type InboundAiFilePart,
} from './vision-model';
import { VisionPdfCanvasFactory } from './vision-pdf-canvas';

const require = createRequire(import.meta.url);

let workerSrc: string | null = null;

function pdfWorkerSrc(): string {
	if (workerSrc) return workerSrc;
	workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
	return workerSrc;
}

function jpegName(filename: string, page: number): string {
	const base = filename.replace(/\.pdf$/i, '');
	return `${base}-p${page}.jpg`;
}

function scaleForPage(width: number, height: number): number {
	const longest = Math.max(width, height, 1);
	return Math.min(VISION_MAX_EDGE / longest, 2);
}

async function jpegFromCanvas(canvas: { toBuffer: (mime: 'image/png') => Buffer }): Promise<Uint8Array | null> {
	const png = canvas.toBuffer('image/png');
	const out = await sharp(png)
		.resize({
			width: VISION_MAX_EDGE,
			height: VISION_MAX_EDGE,
			fit: 'inside',
			withoutEnlargement: true,
		})
		.jpeg({ quality: VISION_JPEG_QUALITY, mozjpeg: true })
		.toBuffer();
	if (out.byteLength === 0 || out.byteLength > VISION_MAX_FILE_BYTES) return null;
	return new Uint8Array(out);
}

type PdfViewport = { width: number; height: number };

async function renderPage(
	page: {
		getViewport: (opts: { scale: number }) => PdfViewport;
		render: (opts: { canvas: unknown; canvasContext: unknown; viewport: PdfViewport }) => {
			promise: Promise<unknown>;
		};
	},
	pageNo: number,
	filename: string,
): Promise<InboundAiFilePart | null> {
	const base = page.getViewport({ scale: 1 });
	const viewport = page.getViewport({ scale: scaleForPage(base.width, base.height) });
	const factory = new VisionPdfCanvasFactory();
	const pair = factory.create(viewport.width, viewport.height);
	try {
		await page.render({
			canvas: pair.canvas,
			canvasContext: pair.context,
			viewport,
		}).promise;
		const data = await jpegFromCanvas(pair.canvas);
		if (!data) return null;
		return { filename: jpegName(filename, pageNo), mediaType: 'image/jpeg', data };
	} finally {
		factory.destroy(pair);
	}
}

/** Strony PDF jako JPEG — xAI/Gateway odrzuca inline application/pdf (400). */
export async function rasterPdfPages(filename: string, bytes: Uint8Array): Promise<InboundAiFilePart[]> {
	if (bytes.byteLength === 0) return [];
	try {
		const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
		pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc();
		const doc = await pdfjs.getDocument({
			data: bytes.slice(),
			CanvasFactory: VisionPdfCanvasFactory,
			disableFontFace: true,
			useSystemFonts: true,
			verbosity: 0,
			isOffscreenCanvasSupported: false,
		}).promise;
		try {
			const out: InboundAiFilePart[] = [];
			const last = Math.min(doc.numPages, VISION_MAX_PDF_PAGES);
			for (let n = 1; n <= last; n += 1) {
				const page = (await doc.getPage(n)) as unknown as Parameters<typeof renderPage>[0];
				const part = await renderPage(page, n, filename);
				if (part) out.push(part);
			}
			return out;
		} finally {
			await doc.cleanup?.();
		}
	} catch {
		return [];
	}
}
