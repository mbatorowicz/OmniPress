import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { optimizeImage } from './optimize-image';
import { IMAGE_MAX_EDGE } from './optimize-image-model';

async function jpegBytes(width: number, height: number, quality = 95): Promise<Uint8Array> {
	const buffer = await sharp({
		create: { width, height, channels: 3, background: { r: 40, g: 80, b: 120 } },
	})
		.jpeg({ quality })
		.toBuffer();
	return new Uint8Array(buffer);
}

describe('optimizeImage', () => {
	it('pomija GIF', async () => {
		const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
		const result = await optimizeImage(gif, 'image/gif');
		expect(result.changed).toBe(false);
		expect(result.mime).toBe('image/gif');
	});

	it('zmniejsza duże JPEG do WebP w limicie boku', async () => {
		const input = await jpegBytes(2400, 1600);
		const result = await optimizeImage(input, 'image/jpeg');
		expect(result.changed).toBe(true);
		expect(result.mime).toBe('image/webp');
		expect(result.bytes.byteLength).toBeLessThan(input.byteLength);

		const meta = await sharp(result.bytes).metadata();
		expect(meta.format).toBe('webp');
		expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(IMAGE_MAX_EDGE);
	});

	it('zostawia małe WebP bez ponownego kodowania', async () => {
		const webp = new Uint8Array(
			await sharp({
				create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } },
			})
				.webp({ quality: 80 })
				.toBuffer(),
		);
		const result = await optimizeImage(webp, 'image/webp');
		expect(result.changed).toBe(false);
		expect(result.bytes).toBe(webp);
	});
});
