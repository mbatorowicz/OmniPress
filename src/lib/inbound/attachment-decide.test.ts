import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, PDF_MIME } from '@/lib/posts/upload-mime';
import { decideAttachmentBytes, decideAttachmentMeta } from './attachment-decide';
import type { InboundAttachmentMeta } from './attachment-model';

const URL = 'https://inbound-cdn.resend.com/a';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

function meta(overrides: Partial<InboundAttachmentMeta> = {}): InboundAttachmentMeta {
	return {
		id: 'att',
		filename: 'foto.png',
		size: PNG.byteLength,
		contentType: 'image/png',
		downloadUrl: URL,
		...overrides,
	};
}

describe('decideAttachment', () => {
	it('zapisuje PNG i PDF; octet-stream + rozszerzenie tez przechodzi', () => {
		expect(decideAttachmentMeta(meta())).toEqual({
			action: 'store',
			filename: 'foto.png',
			mime: 'image/png',
			kind: 'gallery',
		});
		expect(
			decideAttachmentMeta(
				meta({ filename: 'uchwala.pdf', contentType: 'application/octet-stream', size: 80 }),
			),
		).toMatchObject({ action: 'store', mime: PDF_MIME, kind: 'pdf' });
		expect(
			decideAttachmentBytes(
				{ action: 'store', filename: 'foto.png', mime: 'image/png', kind: 'gallery' },
				PNG,
			),
		).toMatchObject({ action: 'store' });
		expect(
			decideAttachmentBytes(
				{ action: 'store', filename: 'u.pdf', mime: PDF_MIME, kind: 'pdf' },
				PDF,
			),
		).toMatchObject({ action: 'store' });
	});

	it('skip: za duzy, obcy typ, zly magic, brak bajtow', () => {
		expect(decideAttachmentMeta(meta({ size: MAX_IMAGE_BYTES + 1 }))).toEqual({
			action: 'skip',
			reason: 'too_large',
			filename: 'foto.png',
		});
		expect(
			decideAttachmentMeta(meta({ filename: 'wirus.exe', contentType: 'application/x-msdownload' })),
		).toMatchObject({ action: 'skip', reason: 'invalid_type' });
		expect(
			decideAttachmentBytes(
				{ action: 'store', filename: 'foto.png', mime: 'image/png', kind: 'gallery' },
				JPEG,
			),
		).toEqual({ action: 'skip', reason: 'invalid_content', filename: 'foto.png' });
		expect(
			decideAttachmentBytes(
				{ action: 'store', filename: 'foto.png', mime: 'image/png', kind: 'gallery' },
				null,
			),
		).toEqual({ action: 'skip', reason: 'fetch_failed', filename: 'foto.png' });
	});
});
