import { marked } from 'marked';
import TurndownService from 'turndown';

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

/** Markdown → HTML do edytora WYSIWYG. */
export function markdownToEditorHtml(md: string): string {
	if (!md.trim()) return '<p></p>';
	const html = marked.parse(md, { async: false }) as string;
	return html.trim() || '<p></p>';
}

/** HTML z edytora → Markdown do bazy. */
export function editorHtmlToMarkdown(html: string): string {
	const cleaned = html
		.replace(/<p><\/p>/g, '')
		.replace(/\s+$/g, '')
		.trim();
	if (!cleaned) return '';
	return turndown.turndown(cleaned).trim();
}
