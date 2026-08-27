/**
 * Opcje `getDocument` dla PDF.js — decyduje, czy plik wolno czytać zakresami.
 *
 * Zakresy (`Range: bytes=…`) pozwalają pdf.js pobrać nagłówek i tylko oglądane
 * strony zamiast całego pliku. Wyjątkiem jest podgląd załącznika w panelu:
 * `/api/posts/{id}/assets/{assetId}/file` odpowiada całym body bez
 * `Accept-Ranges`, więc tam pdf.js musi pobrać plik jednym żądaniem — i tylko
 * tam potrzebuje cookie sesji.
 */

const PANEL_ASSET_PATH = /^\/api\/posts\/[^/]+\/assets\/[^/]+\/file\/?$/;

export type PdfDocumentOptions = {
	url: string;
	disableRange?: true;
	disableStream?: true;
	withCredentials?: true;
};

function pathnameOf(src: string, origin: string | null): string | null {
	if (src.startsWith('/')) return src.split(/[?#]/)[0] ?? null;
	if (!origin || !src.startsWith(origin)) return null;
	return src.slice(origin.length).split(/[?#]/)[0] ?? null;
}

/** Czy `src` wskazuje endpoint panelu serwujący załącznik bez obsługi zakresów. */
export function isPanelAssetEndpoint(src: string, origin: string | null): boolean {
	const pathname = pathnameOf(src, origin);
	return pathname !== null && PANEL_ASSET_PATH.test(pathname);
}

export function pdfDocumentOptions(src: string, origin: string | null): PdfDocumentOptions {
	if (isPanelAssetEndpoint(src, origin)) {
		return { url: src, disableRange: true, disableStream: true, withCredentials: true };
	}
	return { url: src };
}
