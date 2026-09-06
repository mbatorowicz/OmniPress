/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadSelectedFiles } from './attachment-upload';
import { uploadPostAsset } from './upload-asset';

vi.mock('./upload-asset', () => ({
	uploadPostAsset: vi.fn(),
}));

const uploadMock = vi.mocked(uploadPostAsset);

describe('uploadSelectedFiles', () => {
	beforeEach(() => {
		uploadMock.mockReset();
		document.body.innerHTML = '<div data-list></div>';
		vi.stubGlobal('URL', {
			...URL,
			createObjectURL: vi.fn(() => 'blob:pending-preview'),
			revokeObjectURL: vi.fn(),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('pokazuje pending zanim upload wróci i dokłada asset po sukcesie', async () => {
		let finish!: (value: { ok: true; asset: { id: string; url: string; filename: string; mime_type: string; display_mode: string; sort_order: number }; markdown: null }) => void;
		uploadMock.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);

		const added: string[] = [];
		const pendingSnapshots: number[] = [];
		const files = [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })];

		const done = uploadSelectedFiles(files, [], {
			postId: 'post-1',
			kind: 'gallery',
			multiple: true,
			labels: { uploadFailed: 'fail', networkError: 'net', uploading: 'Wysyłanie…' },
			listRoot: document.body,
			onPendingChange(next) {
				pendingSnapshots.push(next.length);
			},
			toAsset(uploaded) {
				added.push(uploaded.id);
			},
		});

		expect(pendingSnapshots[0]).toBe(1);

		finish({
			ok: true,
			asset: {
				id: 'a1',
				url: 'https://cdn.test/a1.jpg',
				filename: 'foto.jpg',
				mime_type: 'image/jpeg',
				display_mode: 'link',
				sort_order: 0,
			},
			markdown: null,
		});

		const leftover = await done;
		expect(leftover).toEqual([]);
		expect(added).toEqual(['a1']);
		expect(pendingSnapshots.at(-1)).toBe(0);
	});

	it('przy błędzie nie dokłada assetu i pokazuje alert', async () => {
		const alertSpy = vi.fn();
		vi.stubGlobal('alert', alertSpy);
		uploadMock.mockResolvedValue({ ok: false, error: 'Za duży' });

		const added: string[] = [];
		const leftover = await uploadSelectedFiles(
			[new File(['x'], 'duzy.jpg', { type: 'image/jpeg' })],
			[],
			{
				postId: 'post-1',
				kind: 'gallery',
				labels: { uploadFailed: 'fail', networkError: 'net', uploading: 'Wysyłanie…' },
				listRoot: document.body,
				onPendingChange() {},
				toAsset(uploaded) {
					added.push(uploaded.id);
				},
			},
		);

		expect(leftover).toEqual([]);
		expect(added).toEqual([]);
		expect(alertSpy).toHaveBeenCalledWith('Za duży');
		vi.unstubAllGlobals();
	});
});
