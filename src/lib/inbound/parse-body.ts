import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { editorHtmlToMarkdownSource } from '@/lib/editor/html-markdown';
import { stripQuotes } from './strip-quotes';

export type InboundMailBody = {
	text?: string | null;
	html?: string | null;
};

function fromPlain(text: string): string {
	return prepareStorageMarkdown(stripQuotes(text.replace(/\r\n/g, '\n')));
}

function fromHtml(html: string): string {
	const source = editorHtmlToMarkdownSource(html);
	if (!source) return '';
	return prepareStorageMarkdown(stripQuotes(source));
}

/** Preferuj text/plain; HTML → ten sam Turndown co edytor. */
export function parseInboundBody(body: InboundMailBody): string {
	const text = body.text ?? '';
	if (text.trim()) return fromPlain(text);
	const html = body.html?.trim() ?? '';
	return html ? fromHtml(html) : '';
}
