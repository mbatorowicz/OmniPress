import { describe, expect, it } from 'vitest';
import {
	isSafeUrl,
	sanitizeEditorHtml,
	sanitizeHtml,
	sanitizePublishMarkdown,
	sanitizeStorageMarkdown,
} from './sanitize';

describe('isSafeUrl', () => {
	it('akceptuje http(s), mailto i ścieżki względne', () => {
		expect(isSafeUrl('https://example.com')).toBe(true);
		expect(isSafeUrl('mailto:a@b.pl')).toBe(true);
		expect(isSafeUrl('./plik.pdf')).toBe(true);
		expect(isSafeUrl('#sekcja')).toBe(true);
	});

	it('odrzuca javascript: i data:', () => {
		expect(isSafeUrl('javascript:alert(1)')).toBe(false);
		expect(isSafeUrl('data:text/html,<script>')).toBe(false);
	});
});

describe('sanitizeHtml', () => {
	it('usuwa script', () => {
		expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
	});

	it('odrzuca link javascript:', () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('x');
	});
});

describe('sanitizeEditorHtml', () => {
	it('usuwa iframe i img', () => {
		expect(sanitizeEditorHtml('<p>ok</p><iframe src="x"></iframe>')).toBe('<p>ok</p>');
		expect(sanitizeEditorHtml('<img src="./x.png" alt="x" />')).toBe('');
	});
});

describe('sanitizeStorageMarkdown', () => {
	it('czyści wklejony HTML i zostawia markdown', () => {
		const md = 'Tekst\n\n<script>alert(1)</script>\n\n**pogrubiony**';
		expect(sanitizeStorageMarkdown(md)).not.toContain('<script>');
		expect(sanitizeStorageMarkdown(md)).toContain('**pogrubiony**');
	});

	it('usuwa niebezpieczne linki markdown', () => {
		const md = '[klik](javascript:alert(1))';
		expect(sanitizeStorageMarkdown(md)).toBe('klik');
	});
});

describe('sanitizePublishMarkdown', () => {
	it('zachowuje blok PDF embed z viewer script', () => {
		const embed =
			'<div class="op-pdf-viewer" data-op-pdf-src="./doc.pdf" data-op-pdf-title="doc.pdf" data-op-pdf-labels="{}"></div>' +
			'<script type="module" src="/omnipress/pdf-viewer.js"></script>';
		const md = `Wstęp\n\n${embed}\n\nKoniec`;
		const out = sanitizePublishMarkdown(md);
		expect(out).toContain('op-pdf-viewer');
		expect(out).toContain('/omnipress/pdf-viewer.js');
		expect(out).not.toContain('<iframe');
	});
});
