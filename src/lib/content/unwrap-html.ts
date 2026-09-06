import { shouldJoinWrappedLines } from './unwrap-paragraphs';

function htmlToPlain(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function unwrapBreaksInParagraph(inner: string): string {
	const parts = inner.split(/<br\s*\/?>/i);
	if (parts.length < 2) return inner;

	let out = parts[0] ?? '';
	for (const part of parts.slice(1)) {
		if (shouldJoinWrappedLines(htmlToPlain(out), htmlToPlain(part))) {
			out = `${out.replace(/\s+$/, '')} ${part.trim()}`;
		} else {
			out = `${out}<br>${part}`;
		}
	}
	return out;
}

/** Scala wklejone z Worda `<p>` / `<br>` w połowie zdania — ten sam warunek co Markdown. */
export function unwrapHardWrappedHtml(html: string): string {
	const withBreaks = html.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner: string) => {
		return `<p>${unwrapBreaksInParagraph(inner)}</p>`;
	});

	const tokens = withBreaks.split(/(<p\b[^>]*>[\s\S]*?<\/p>)/gi).filter((token) => token.trim().length > 0);
	const out: string[] = [];
	for (const token of tokens) {
		const current = token.match(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i);
		const prev = out[out.length - 1];
		const previous = prev?.match(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i);
		if (current && previous && shouldJoinWrappedLines(htmlToPlain(previous[1] ?? ''), htmlToPlain(current[1] ?? ''))) {
			out[out.length - 1] = `<p>${(previous[1] ?? '').replace(/\s+$/, '')} ${(current[1] ?? '').trim()}</p>`;
		} else {
			out.push(token);
		}
	}
	return out.join('');
}
