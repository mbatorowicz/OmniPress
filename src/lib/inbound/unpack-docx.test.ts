import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { unpackDocxForInbound } from './unpack-docx';
import { docxWithMedia } from './extract-fixture-docx';

async function jpegBytes(width: number, height: number): Promise<Uint8Array> {
	const buffer = await sharp({
		create: { width, height, channels: 3, background: { r: 30, g: 90, b: 50 } },
	})
		.jpeg({ quality: 85 })
		.toBuffer();
	return new Uint8Array(buffer);
}

describe('unpackDocxForInbound', () => {
	it('logo / infografika → galeria, bez DOCX', async () => {
		const jpeg = await jpegBytes(1000, 360);
		const result = await unpackDocxForInbound(
			docxWithMedia('Dofinansowanie WFOŚ', 'image1.jpeg', jpeg),
			'inf. WFOŚ.docx',
		);
		expect(result.dropDocx).toBe(true);
		expect(result.images).toHaveLength(1);
		expect(result.images[0]?.filename).toBe('inf. WFOŚ.webp');
		expect(result.images[0]?.mime).toBe('image/webp');
	});

	it('EMF (pieczęć) zostawia DOCX, bez grafiki treści', async () => {
		const emf = new Uint8Array([0x01, 0x00, 0x00, 0x00, 1, 2, 3, 4]);
		const result = await unpackDocxForInbound(docxWithMedia('Pismo', 'stamp.emf', emf), 'pismo.docx');
		expect(result.dropDocx).toBe(false);
		expect(result.images).toHaveLength(0);
	});
});
