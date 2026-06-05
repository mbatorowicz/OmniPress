import { describe, expect, it } from 'vitest';
import { editorHtmlToMarkdown, markdownToEditorHtml } from './html-markdown';

describe('html-markdown', () => {
	it('konwertuje markdown ↔ html', () => {
		const md = '## Nagłówek\n\nAkapit z **pogrubieniem**.';
		const html = markdownToEditorHtml(md);
		expect(html).toContain('<h2>');
		const back = editorHtmlToMarkdown(html);
		expect(back).toContain('Nagłówek');
		expect(back).toContain('pogrubieniem');
	});
});
