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

	it('usuwa wklejony script z HTML edytora', () => {
		const md = editorHtmlToMarkdown('<p>ok</p><script>alert(1)</script><p>dalej</p>');
		expect(md).not.toContain('<script');
		expect(md).toContain('ok');
		expect(md).toContain('dalej');
	});

	it('czyści niebezpieczne linki przy zapisie', () => {
		const md = editorHtmlToMarkdown(
			'<p><a href="javascript:alert(1)">klik</a></p>',
		);
		expect(md).not.toContain('javascript:');
	});
});
