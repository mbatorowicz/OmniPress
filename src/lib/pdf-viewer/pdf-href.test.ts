import { describe, expect, it } from 'vitest';
import { isPdfHref, pdfFilenameFromSrc } from './pdf-href';

describe('isPdfHref', () => {
	it('rozpoznaje względne i absolutne PDF', () => {
		expect(isPdfHref('./uchwala.pdf')).toBe(true);
		expect(isPdfHref('/post-files/wpis/a.pdf')).toBe(true);
		expect(isPdfHref('https://gmina.example/page-files/x.PDF')).toBe(true);
		expect(isPdfHref('/plik.pdf?dl=1')).toBe(true);
	});

	it('odrzuca strony, skrypty i inne protokoły', () => {
		expect(isPdfHref('/aktualnosci')).toBe(false);
		expect(isPdfHref('javascript:alert(1)')).toBe(false);
		expect(isPdfHref('mailto:a@b.pl')).toBe(false);
		expect(isPdfHref('')).toBe(false);
	});
});

describe('pdfFilenameFromSrc', () => {
	it('bierze basename z ścieżki', () => {
		expect(pdfFilenameFromSrc('/post-files/wpis/ogloszenie.pdf')).toBe('ogloszenie.pdf');
		expect(pdfFilenameFromSrc('./a.pdf')).toBe('a.pdf');
	});

	it('nie pozwala na separatoy w nazwie', () => {
		expect(pdfFilenameFromSrc('/')).toBe('dokument.pdf');
	});
});
