const ATTR_LINE =
	/^(?:>+\s*)?(?:On\b.+\bwrote:|Dnia\s+\d.+\bnapisał(?:a|\(a\))?:?)\s*$/i;
const SIG_LINE = /^-- ?$/;

function isQuoteOrSignatureStart(line: string): boolean {
	const trimmed = line.trimEnd();
	if (SIG_LINE.test(trimmed) || trimmed.trim() === '--') return true;
	return ATTR_LINE.test(trimmed.trim());
}

/** Obetnij cytat (`On … wrote` / `Dnia … napisał`) i stopkę RFC `-- `. */
export function stripQuotes(text: string): string {
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	const cut = lines.findIndex(isQuoteOrSignatureStart);
	const kept = cut === -1 ? lines : lines.slice(0, cut);
	return kept.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
}
