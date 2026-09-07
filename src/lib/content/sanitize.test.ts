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

	it('zdejmuje onclick z p (regresja)', () => {
		expect(sanitizeHtml('<p onclick="alert(1)">ok</p>')).toBe('<p>ok</p>');
	});

	it('usuwa div z onclick — parę i niezamknięty', () => {
		expect(sanitizeHtml('<div onclick="alert(1)">x</div>')).toBe('x');
		expect(sanitizeHtml('<div onmouseover="alert(1)">x')).toBe('x');
		expect(sanitizeHtml('<div onclick="alert(1)">')).not.toContain('onclick');
		expect(sanitizeHtml('<div onclick="alert(1)">')).not.toContain('<div');
	});

	it('nie zostawia javascript: w href po encjach HTML', () => {
		expect(sanitizeHtml('<a href="javascript&#58;alert(1)">x</a>')).toBe('x');
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

	it('usuwa onclick z p w markdownie', () => {
		expect(sanitizeStorageMarkdown('<p onclick="alert(1)">ok</p>')).toBe('<p>ok</p>');
	});

	it('usuwa div z onclick (para i niezamknięty) oraz javascript: w a', () => {
		expect(sanitizeStorageMarkdown('<div onclick="alert(1)">x</div>')).toBe('x');
		expect(sanitizeStorageMarkdown('przed <div onmouseover="alert(1)">po')).toBe('przed po');
		expect(sanitizeStorageMarkdown('<a href="javascript:alert(1)">klik</a>')).toBe('klik');
		expect(sanitizeStorageMarkdown('<div onclick="alert(1)">')).not.toContain('onclick');
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

	it('nie publikuje handlerów ani javascript:', () => {
		const md =
			'<div onclick="alert(1)">trucizna</div>\n\n<a href="javascript:alert(1)">klik</a>\n\n**ok**';
		const out = sanitizePublishMarkdown(md);
		expect(out).not.toContain('onclick');
		expect(out).not.toContain('javascript:');
		expect(out).toContain('trucizna');
		expect(out).toContain('klik');
		expect(out).toContain('**ok**');
	});
});
