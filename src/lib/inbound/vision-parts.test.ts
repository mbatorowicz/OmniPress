import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { VISION_MAX_IMAGE_PARTS } from './vision-model';
import { buildInboundVisionParts } from './vision-parts';

async function tinyJpeg(): Promise<Uint8Array> {
	const buf = await sharp({
		create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
	})
		.jpeg()
		.toBuffer();
	return new Uint8Array(buf);
}

describe('buildInboundVisionParts', () => {
	it('nie pcha więcej niż 16 obrazów', async () => {
		const jpeg = await tinyJpeg();
		const attachments = Array.from({ length: VISION_MAX_IMAGE_PARTS + 1 }, (_, i) => ({
			filename: `a${i}.jpg`,
			mime: 'image/jpeg',
			text: '',
			pageCount: null,
			suggestedDisplay: 'embed' as const,
			bytes: jpeg,
		}));
		const parts = await buildInboundVisionParts(attachments);
		expect(parts).toHaveLength(VISION_MAX_IMAGE_PARTS);
		expect(parts.every((part) => part.mediaType !== 'application/pdf')).toBe(true);
	});
});
