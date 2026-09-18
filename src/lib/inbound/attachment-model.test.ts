import { describe, expect, it } from 'vitest';
import { inbound } from '@/i18n';
import {
	INBOUND_MAX_ATTACHMENTS,
	inboundAttachmentFilename,
	inboundDeclaredMime,
	kindForUploadMime,
	parseReceivedAttachments,
	resolveInboundMime,
	splitAttachmentLimit,
} from './attachment-model';
import { PDF_MIME } from '@/lib/posts/upload-mime';

const PNG_URL = 'https://inbound-cdn.resend.com/mail/attachments/a?sig=1';

describe('attachment-model', () => {
	it('mapuje liste Resend i odrzuca URL bez https', () => {
		expect(
			parseReceivedAttachments({
				object: 'list',
				data: [
					{
						id: 'att-1',
						filename: 'avatar.png',
						size: 4096,
						content_type: 'image/png',
						download_url: PNG_URL,
					},
					{ filename: 'x.png', download_url: 'http://evil.test/x.png' },
					{ filename: 'brak-url', content_type: 'image/png' },
				],
			}),
		).toEqual([
			{
				id: 'att-1',
				filename: 'avatar.png',
				size: 4096,
				contentType: 'image/png',
				downloadUrl: PNG_URL,
			},
		]);
	});

	it('tnie liste do limitu i uzupelnia nazwe z MIME', () => {
		const items = Array.from({ length: INBOUND_MAX_ATTACHMENTS + 2 }, (_, i) => ({
			id: `a${i}`,
			filename: `f${i}.png`,
			size: 10,
			contentType: 'image/png',
			downloadUrl: PNG_URL,
		}));
		const { accepted, overflow } = splitAttachmentLimit(items);
		expect(accepted).toHaveLength(INBOUND_MAX_ATTACHMENTS);
		expect(overflow).toHaveLength(2);

		expect(inboundDeclaredMime('image/jpeg; charset=binary')).toBe('image/jpeg');
		expect(resolveInboundMime('raport.pdf', 'application/octet-stream')).toBe(PDF_MIME);
		expect(resolveInboundMime('foto', 'image/jpeg; charset=binary')).toBe('image/jpeg');
		expect(inboundAttachmentFilename('', 'image/png')).toBe(`${inbound.unnamedFile}.png`);
		expect(kindForUploadMime(PDF_MIME)).toBe('pdf');
	});
});
