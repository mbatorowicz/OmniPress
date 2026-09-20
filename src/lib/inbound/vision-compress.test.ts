import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { compressVisionImage } from './vision-compress';

async function tinyGif(): Promise<Uint8Array> {
	const buf = await sharp({
		create: { width: 8, height: 8, channels: 3, background: { r: 12, g: 34, b: 56 } },
	})
		.gif()
		.toBuffer();
	return new Uint8Array(buf);
}

describe('compressVisionImage', () => {
	it('GIF → pierwsza klatka JPEG', async () => {
		const part = await compressVisionImage('anim.gif', 'image/gif', await tinyGif());
		expect(part).not.toBeNull();
		expect(part?.mediaType).toBe('image/jpeg');
		expect(part?.filename).toBe('anim.jpg');
		expect(part?.data[0]).toBe(0xff);
		expect(part?.data[1]).toBe(0xd8);
	});
});
