import { marked } from 'marked';
import TurndownService from 'turndown';
import { sanitizeEditorHtml, sanitizeMarkdownUrls, sanitizeStorageMarkdown } from '@/lib/content/sanitize';

marked.setOptions({ gfm: true, breaks: true });

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

/** Markdown → HTML do edytora WYSIWYG (po sanityzacji). */
export function markdownToEditorHtml(md: string): string {
	const safeMd = sanitizeStorageMarkdown(md);
	if (!safeMd.trim()) return '<p></p>';
	const html = marked.parse(safeMd, { async: false }) as string;
	return sanitizeEditorHtml(html.trim() || '<p></p>');
}

/** HTML z edytora → Markdown do bazy (po sanityzacji). */
export function editorHtmlToMarkdown(html: string): string {
	const safe = sanitizeEditorHtml(html);
	const cleaned = safe
		.replace(/<p><\/p>/g, '')
		.replace(/\s+$/g, '')
		.trim();
	if (!cleaned) return '';
	const md = turndown.turndown(cleaned).trim();
	return sanitizeStorageMarkdown(sanitizeMarkdownUrls(md));
}
