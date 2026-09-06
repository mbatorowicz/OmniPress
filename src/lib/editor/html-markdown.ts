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

/** HTML z edytora → Markdown do bazy (sanityzacja + ten sam model akapitów). */
export function editorHtmlToMarkdown(html: string): string {
	const safe = unwrapHardWrappedHtml(sanitizeEditorHtml(html));
	const cleaned = safe
		.replace(/<p><\/p>/g, '')
		.replace(/\s+$/g, '')
		.trim();
	if (!cleaned) return '';
	const md = turndown.turndown(cleaned).trim();
	return prepareStorageMarkdown(sanitizeMarkdownUrls(md));
}
