const DANGEROUS_URL_RE = /^\s*(javascript|data|vbscript|file):/i;

/** Bezpieczny href/src — http(s), mailto, tel, ścieżki względne, kotwice. */
export function isSafeUrl(url: string): boolean {
	const trimmed = url.trim();
	if (!trimmed) return false;
	if (DANGEROUS_URL_RE.test(trimmed)) return false;
	if (/^[\x00-\x1f]/.test(trimmed)) return false;
	if (trimmed.startsWith('#')) return true;
	if (trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/')) return true;
	if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return true;
	return false;
}

/** Usuwa niebezpieczne URL-e w składni Markdown link/obraz. */
export function sanitizeMarkdownUrls(md: string): string {
	let result = '';
	let i = 0;

	while (i < md.length) {
		const isImage = md[i] === '!';
		const bracketStart = isImage ? i + 1 : i;
		if (md[bracketStart] === '[') {
			const bracketEnd = md.indexOf(']', bracketStart + 1);
			if (bracketEnd !== -1 && md[bracketEnd + 1] === '(') {
				const label = md.slice(bracketStart + 1, bracketEnd);
				let depth = 1;
				let j = bracketEnd + 2;
				while (j < md.length && depth > 0) {
					if (md[j] === '(') depth += 1;
					else if (md[j] === ')') depth -= 1;
					j += 1;
				}
				if (depth === 0) {
					const url = md.slice(bracketEnd + 2, j - 1).trim();
					if (isSafeUrl(url)) {
						result += `${isImage ? '!' : ''}[${label}](${url})`;
					} else if (!isImage) {
						result += label;
					}
					i = j;
					continue;
				}
			}
		}
		result += md[i];
		i += 1;
	}

	return result;
}
