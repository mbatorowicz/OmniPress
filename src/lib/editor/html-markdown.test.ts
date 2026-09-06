import { describe, expect, it } from 'vitest';
import { markdownToSafeHtml } from '@/lib/content/render-markdown';
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

	it('zapis i odczyt dają ten sam układ akapitów co podgląd', () => {
		const html =
			'<p>“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu</p>' +
			'<p>szkolnym w Miedznie przy ul. Kościelnej 15.</p>';
		const md = editorHtmlToMarkdown(html);
		expect(md.split('\n\n')).toHaveLength(1);
		const editor = markdownToEditorHtml(md);
		const preview = markdownToSafeHtml(md);
		expect(editor.match(/<p>/g)?.length).toBe(preview.match(/<p>/g)?.length);
		expect(preview).toContain('placu szkolnym');
	});
});
