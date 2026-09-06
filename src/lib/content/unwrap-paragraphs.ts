/** Lustro heurystyki: repo Astro `src/lib/remark-unwrap-hard-wraps.js`. */

const SENTENCE_END = /[.!?…]$|[.!?…][\s)"»"”']+$/u;
const MIN_WRAP_LEN = 40;
const STRUCTURAL_RE = /^(#{1,6}\s|[-*+]\s|\d+\.\s|>|!\[|<div\b|\[📄)/;

export function isStructuralMarkdownLine(line: string): boolean {
	return STRUCTURAL_RE.test(line.trim());
}

const LOWER_START = /^[a-z\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c]/;

function startsLikeContinuation(next: string): boolean {
	return LOWER_START.test(next.trim());
}

/** Czy `prev` + `next` to złamany wiersz (Word / Enter w połowie zdania), nie nowy akapit. */
export function shouldJoinWrappedLines(prev: string, next: string): boolean {
	const a = prev.replace(/\s+/g, ' ').trim();
	const b = next.replace(/\s+/g, ' ').trim();
	if (!a || !b) return false;
	if (isStructuralMarkdownLine(a) || isStructuralMarkdownLine(b)) return false;
	if (SENTENCE_END.test(a)) return false;
	if (a.length >= MIN_WRAP_LEN) return true;
	return startsLikeContinuation(b) && b.length >= MIN_WRAP_LEN;
}

function collapseInnerNewlines(block: string): string {
	const trimmed = block.trim();
	if (!trimmed) return '';
	if (isStructuralMarkdownLine(trimmed.split('\n')[0] ?? '') || trimmed.includes('<div ')) {
		return trimmed;
	}

	const lines = trimmed.split('\n');
	if (lines.length <= 1) return trimmed;

	let out = lines[0] ?? '';
	for (const raw of lines.slice(1)) {
		if (/ {2}$/.test(out)) {
			out = `${out}\n${raw.trim()}`;
			continue;
		}
		const line = raw.trim();
		if (!line) continue;
		out = shouldJoinWrappedLines(out, line) ? `${out} ${line}` : `${out}\n${line}`;
	}
	return out;
}

/** Scala pozorne akapity ze złamanych wierszy; zostawia prawdziwe przerwy i twarde `<br>`. */
export function unwrapHardWrappedMarkdown(md: string): string {
	const normalized = md.replace(/\r\n/g, '\n').trim();
	if (!normalized) return '';

	const blocks = normalized.split(/\n{2,}/).map(collapseInnerNewlines).filter(Boolean);
	const out: string[] = [];
	for (const block of blocks) {
		if (out.length > 0 && shouldJoinWrappedLines(out[out.length - 1] ?? '', block)) {
			out[out.length - 1] = `${out[out.length - 1]} ${block}`;
		} else {
			out.push(block);
		}
	}
	return out.join('\n\n');
}
