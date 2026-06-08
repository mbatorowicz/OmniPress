import { describe, expect, it } from 'vitest';
import { markdownToSafeHtml, sanitizeHtml } from './markdown';

describe('markdownToSafeHtml', () => {
	it('konwertuje nagłówek i akapit', () => {
		const html = markdownToSafeHtml('# Tytuł\n\nTekst **pogrubiony**.');
		expect(html).toContain('<h1>Tytuł</h1>');
		expect(html).toContain('<strong>pogrubiony</strong>');
	});

	it('usuwa script z HTML', () => {
		expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
	});

	it('zachowuje zamykające </a> w linkach mailto', () => {
		const html = markdownToSafeHtml(
			'Kontakt: [anna@modr.pl](mailto:anna@modr.pl)',
		);
		expect(html).toContain('<a href="mailto:anna@modr.pl"');
		expect(html).toContain('</a>');
		expect(html).not.toMatch(/<a[^>]*>[^<]*<\/p>/);
	});
});
