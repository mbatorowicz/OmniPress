import { parseInboundSubject } from './parse-subject';

const GENERIC_EXACT =
	/^(informacja|prosz[ęe] o publikacj[ęe]|bez tytu[łl]u)$/i;
/** Opis nośnika, nie sprawa: „Plakaty o wściekliźnie”, „Plakat szczepień”. */
const GENERIC_PREFIX =
	/^(plakaty|plakat|za[łl][aą]czniki?|ulotki?|materia[łl]y|skany?)(\b|[ :—–-])/i;

export function isGenericTitle(title: string): boolean {
	const normalized = title.replace(/\s+/g, ' ').trim();
	if (!normalized) return true;
	return GENERIC_EXACT.test(normalized) || GENERIC_PREFIX.test(normalized);
}

export function titleFromExcerpt(text: string): string {
	const line = text.replace(/\s+/g, ' ').trim();
	if (line.length < 8) return '';
	return parseInboundSubject(line.slice(0, 120));
}

export function resolveEnrichTitle(
	proposed: string,
	fallbackTitle: string,
	excerpts: string[],
): string {
	const title = parseInboundSubject(proposed) || fallbackTitle;
	if (!isGenericTitle(title)) return title;
	for (const excerpt of excerpts) {
		const fromFile = titleFromExcerpt(excerpt);
		if (fromFile && !isGenericTitle(fromFile)) return fromFile;
	}
	if (fallbackTitle && !isGenericTitle(fallbackTitle)) return fallbackTitle;
	return title;
}
