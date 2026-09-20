import { describe, expect, it } from 'vitest';
import { pdfWithText } from './extract-fixture-pdf';
import { visionPdfPart, visionPdfParts } from './vision-pdf';

describe('visionPdfParts', () => {
	it('oddaje JPEG stron, nie native PDF', async () => {
		const parts = await visionPdfParts('festyn.pdf', pdfWithText('Festyn gminny 2026'));
		expect(parts.length).toBeGreaterThan(0);
		for (const part of parts) {
			expect(part.mediaType).toBe('image/jpeg');
			expect(part.filename).toMatch(/festyn-p\d+\.jpg/);
			expect(part.data[0]).toBe(0xff);
			expect(part.data[1]).toBe(0xd8);
		}
		const first = await visionPdfPart('festyn.pdf', pdfWithText('Festyn gminny 2026'));
		expect(first?.mediaType).toBe('image/jpeg');
	});

	it('puste bajty = brak części', async () => {
		expect(await visionPdfParts('a.pdf', new Uint8Array())).toEqual([]);
		expect(await visionPdfPart('a.pdf', new Uint8Array())).toBeNull();
	});
});
