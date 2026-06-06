import { describe, expect, it } from 'vitest';
import { applyAssetDisplayToMarkdown, pdfEmbedHtml, segmentContentForRender } from './asset-markdown';

describe('pdfEmbedHtml', () => {
	it('tworzy blok PDF.js z data-op-pdf-src', () => {
		expect(pdfEmbedHtml('./doc.pdf', 'Doc')).toContain('class="op-pdf-viewer"');
		expect(pdfEmbedHtml('./doc.pdf', 'Doc')).toContain('data-op-pdf-src="./doc.pdf"');
		expect(pdfEmbedHtml('./doc.pdf', 'Doc')).not.toContain('<iframe');
	});

	it('dodaje skrypt viewer przy publikacji', () => {
		const html = pdfEmbedHtml('./doc.pdf', 'Doc', true);
		expect(html).toContain('/omnipress/pdf-viewer.js');
	});
});

describe('applyAssetDisplayToMarkdown', () => {
	it('zamienia link PDF na embed gdy display_mode=embed', () => {
		const md = 'Tekst\n\n[📄 MZW.pdf](https://x.test/a.pdf)\n';
		const out = applyAssetDisplayToMarkdown(md, [
			{
				filename: 'MZW.pdf',
				mime_type: 'application/pdf',
				display_mode: 'embed',
				sourceUrl: 'https://x.test/a.pdf',
				publishUrl: './MZW.pdf',
			},
		]);
		expect(out).toContain('class="op-pdf-viewer"');
		expect(out).not.toContain('[📄 MZW.pdf]');
	});

	it('zostawia link gdy display_mode=link', () => {
		const md = '[📄 MZW.pdf](https://x.test/a.pdf)';
		const out = applyAssetDisplayToMarkdown(md, [
			{
				filename: 'MZW.pdf',
				mime_type: 'application/pdf',
				display_mode: 'link',
				sourceUrl: 'https://x.test/a.pdf',
				publishUrl: './MZW.pdf',
			},
		]);
		expect(out).toBe(md);
	});
});

describe('segmentContentForRender', () => {
	it('oddziela markdown od bloku embed', () => {
		const embed = pdfEmbedHtml('./a.pdf', 'A');
		const content = `Wstęp\n\n${embed}\n\nKoniec`;
		const segments = segmentContentForRender(content);
		expect(segments).toHaveLength(3);
		expect(segments[0]?.type).toBe('md');
		expect(segments[1]?.type).toBe('embed');
		expect(segments[2]?.type).toBe('md');
	});
});
