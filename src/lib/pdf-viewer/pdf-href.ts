/** Czy href prowadzi do pliku PDF (ścieżka, nie query). */
export function isPdfHref(href: string): boolean {
	const trimmed = href.trim();
	if (!trimmed) return false;
	if (/^(javascript|data|blob|mailto|tel):/i.test(trimmed)) return false;

	try {
		const url = new URL(trimmed, 'https://example.invalid/');
		return /\.pdf$/i.test(url.pathname);
	} catch {
		return false;
	}
}

/** Basename z adresu PDF; bez separatorów ścieżki. */
export function pdfFilenameFromSrc(src: string): string {
	try {
		const raw = new URL(src, 'https://example.invalid/').pathname.split('/').pop() ?? '';
		const base = decodeURIComponent(raw).replace(/[/\\]/g, '');
		if (base.toLowerCase().endsWith('.pdf') && base.length > 4 && base.length <= 180) {
			return base;
		}
	} catch {
		/* ignore */
	}
	return 'dokument.pdf';
}
