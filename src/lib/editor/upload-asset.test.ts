import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadPostAsset } from './upload-asset';
import { putSignedUpload } from './upload-xhr';

vi.mock('./upload-xhr', () => ({
	putSignedUpload: vi.fn(),
	uploadStagePercent: vi.fn((stage: string, putFraction = 0) => {
		if (stage === 'url') return 5;
		if (stage === 'put') return Math.round(5 + putFraction * 90);
		if (stage === 'complete') return 95;
		return 100;
	}),
}));

const putMock = vi.mocked(putSignedUpload);

describe('uploadPostAsset', () => {
	beforeEach(() => {
		putMock.mockReset();
		vi.unstubAllGlobals();
	});

	it('raportuje postęp i zwraca asset po komplecie', async () => {
		const percents: number[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith('/upload-url')) {
					return {
						ok: true,
						json: async () => ({
							signedUrl: 'https://storage.test/put',
							path: 'post-1/a.jpg',
							mime: 'image/jpeg',
							filename: 'foto.jpg',
							kind: 'gallery',
						}),
					};
				}
				return {
					ok: true,
					json: async () => ({
						asset: {
							id: 'a1',
							url: 'https://cdn.test/a1.jpg',
							filename: 'foto.jpg',
							mime_type: 'image/jpeg',
							display_mode: 'link',
							sort_order: 0,
						},
						markdown: null,
					}),
				};
			}),
		);
		putMock.mockImplementation(async (_url, _body, onProgress) => {
			onProgress?.(0.5);
		});

		const result = await uploadPostAsset(
			'post-1',
			new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
			'gallery',
			{ uploadFailed: 'fail', networkError: 'net' },
			(fraction) => percents.push(Math.round(fraction * 100)),
		);

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.asset.id).toBe('a1');
		expect(percents).toContain(5);
		expect(percents).toContain(50);
		expect(percents).toContain(100);
	});

	it('mapuje błąd sieci PUT na etykietę', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					signedUrl: 'https://storage.test/put',
					path: 'post-1/a.jpg',
					mime: 'image/jpeg',
				}),
			})),
		);
		putMock.mockRejectedValue(new Error('network'));

		const result = await uploadPostAsset(
			'post-1',
			new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
			'gallery',
			{ uploadFailed: 'fail', networkError: 'sieć' },
		);

		expect(result).toEqual({ ok: false, error: 'sieć' });
	});
});
