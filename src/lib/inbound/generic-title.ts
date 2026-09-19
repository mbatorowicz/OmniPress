import { parseInboundSubject } from './parse-subject';

const GENERIC_TITLE =
	/^(plakaty|za[łl][aą]czniki?|informacja|prosz[ęe] o publikacj[ęe]|bez tytu[łl]u)$/i;

export function isGenericTitle(title: string): boolean {
	return GENERIC_TITLE.test(title.replace(/\s+/g, ' ').trim());
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
