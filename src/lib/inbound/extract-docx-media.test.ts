import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { extractDocxMedia } from './extract-docx-media';
import { docxWithMedia, docxWithText } from './extract-fixture-docx';

async function jpegBytes(width: number, height: number): Promise<Uint8Array> {
	const buffer = await sharp({
		create: { width, height, channels: 3, background: { r: 20, g: 80, b: 40 } },
	})
		.jpeg({ quality: 80 })
		.toBuffer();
	return new Uint8Array(buffer);
}

describe('extractDocxMedia', () => {
	it('czyta JPEG z word/media', async () => {
		const jpeg = await jpegBytes(120, 80);
		const files = await extractDocxMedia(docxWithMedia('Tekst', 'image1.jpeg', jpeg));
		expect(files).toHaveLength(1);
		expect(files[0]).toMatchObject({ name: 'image1.jpeg', mime: 'image/jpeg' });
		expect(files[0]?.bytes.byteLength).toBe(jpeg.byteLength);
	});

	it('pusty i sam tekst — bez mediów', async () => {
		expect(await extractDocxMedia(new Uint8Array())).toEqual([]);
		expect(await extractDocxMedia(docxWithText('Bez obrazka'))).toEqual([]);
	});
});
