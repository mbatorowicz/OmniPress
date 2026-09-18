import TurndownService from 'turndown';
import { sanitizeEditorHtml, sanitizeMarkdownUrls } from '@/lib/content/sanitize';
import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { unwrapHardWrappedHtml } from '@/lib/content/unwrap-html';

export { markdownToEditorHtml } from '@/lib/content/render-markdown';

const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	emDelimiter: '*',
});

turndown.addRule('lineBreak', {
	filter: 'br',
	replacement: () => '  \n',
});

turndown.addRule('removeUnsafe', {
	filter: ['script', 'style', 'iframe', 'object', 'embed'],
	replacement: () => '',
});

/** HTML → MD po Turndown (bez unwrap akapitów). Poczta zdejmuje cytaty przed prepare. */
export function editorHtmlToMarkdownSource(html: string): string {
	const safe = unwrapHardWrappedHtml(sanitizeEditorHtml(html));
	const cleaned = safe
		.replace(/<p><\/p>/g, '')
		.replace(/\s+$/g, '')
		.trim();
	if (!cleaned) return '';
	return sanitizeMarkdownUrls(turndown.turndown(cleaned).trim());
}

/** HTML z edytora → Markdown do bazy (sanityzacja + ten sam model akapitów). */
export function editorHtmlToMarkdown(html: string): string {
	const md = editorHtmlToMarkdownSource(html);
	return md ? prepareStorageMarkdown(md) : '';
}
