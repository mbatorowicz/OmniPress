import { describe, expect, it } from 'vitest';
import { rowsToStore } from './apply-attachment-rows';
import { DOCX_MIME } from '@/lib/posts/upload-mime';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0, 1, 2]);

describe('rowsToStore', () => {
	it('obraz z maila idzie 1:1', async () => {
		const rows = await rowsToStore(
			{ filename: 'foto.png', mime: 'image/png', kind: 'gallery' },
			JPEG,
			async () => ({ dropDocx: true, images: [] }),
		);
		expect(rows).toEqual([
			{ filename: 'foto.png', mime: 'image/png', kind: 'gallery', bytes: JPEG },
		]);
	});

	it('DOCX bez pieczęci → tylko grafiki galerii', async () => {
		const img = { filename: 'logo.webp', mime: 'image/webp', bytes: JPEG };
		const rows = await rowsToStore(
			{ filename: 'info.docx', mime: DOCX_MIME, kind: 'docx' },
			JPEG,
			async () => ({ dropDocx: true, images: [img] }),
		);
		expect(rows).toEqual([{ ...img, kind: 'gallery' }]);
	});

	it('DOCX z pieczęcią → grafiki + oryginał', async () => {
		const img = { filename: 'logo.webp', mime: 'image/webp', bytes: JPEG };
		const rows = await rowsToStore(
			{ filename: 'pismo.docx', mime: DOCX_MIME, kind: 'docx' },
			JPEG,
			async () => ({ dropDocx: false, images: [img] }),
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]?.kind).toBe('gallery');
		expect(rows[1]?.kind).toBe('docx');
	});
});
