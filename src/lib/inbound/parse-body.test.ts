import { describe, expect, it } from 'vitest';
import { parseInboundBody } from './parse-body';

const HTML_WITH_SCRIPT = `<p>Ogłoszenie o przetargu.</p>
<script>document.location='https://evil.test'</script>
<p>Termin: 30 września.</p>
<img src="x" onerror="alert(1)">`;

const HTML_WITH_QUOTE = `<div>Zapraszamy na festyn.</div>
<br>
<div class="gmail_quote">
<div class="gmail_attr">On Fri, Sep 18, 2026 at 9:00 PM Jan Kowalski wrote:<br></div>
<blockquote class="gmail_quote"><p>Stara wiadomość z cytatem.</p></blockquote>
</div>`;

const PLAIN_PREFERRED = 'Wersja tekstowa ogłoszenia.';
const HTML_FALLBACK = '<p>Wersja <strong>HTML</strong> ogłoszenia.</p>';

describe('parseInboundBody', () => {
	it('woli text/plain niż HTML', () => {
		const md = parseInboundBody({ text: PLAIN_PREFERRED, html: HTML_FALLBACK });
		expect(md).toBe(PLAIN_PREFERRED);
		expect(md).not.toContain('HTML');
	});

	it('HTML ze skryptem → markdown bez skryptu i z treścią', () => {
		const md = parseInboundBody({ html: HTML_WITH_SCRIPT });
		expect(md).not.toMatch(/<script/i);
		expect(md).not.toContain('evil.test');
		expect(md).not.toContain('alert(');
		expect(md).toContain('Ogłoszenie o przetargu.');
		expect(md).toContain('Termin: 30 września.');
	});

	it('zdejmuje cytat z HTML po Turndown', () => {
		const md = parseInboundBody({ html: HTML_WITH_QUOTE });
		expect(md).toContain('Zapraszamy na festyn.');
		expect(md).not.toContain('Stara wiadomość');
		expect(md).not.toMatch(/wrote:/i);
	});

	it('zdejmuje cytat z text/plain', () => {
		const md = parseInboundBody({
			text: 'Nowa treść.\n\nOn Mon, Jan 1, 2024 at 10:00 AM Jan wrote:\n> cytat\n',
		});
		expect(md).toBe('Nowa treść.');
	});

	it('puste ciało daje pusty markdown', () => {
		expect(parseInboundBody({})).toBe('');
		expect(parseInboundBody({ text: '   ', html: '' })).toBe('');
	});
});
