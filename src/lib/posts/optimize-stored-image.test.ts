import { describe, expect, it, vi } from 'vitest';
import { replaceOptimizedStoredImage } from './optimize-stored-image';

describe('replaceOptimizedStoredImage', () => {
	it('nie rusza plików poza JPEG/PNG/WebP', async () => {
		const download = vi.fn();
		const supabase = {
			storage: { from: () => ({ download, upload: vi.fn(), remove: vi.fn() }) },
		} as never;

		const result = await replaceOptimizedStoredImage(
			supabase,
			'post-1/a.gif',
			'image/gif',
		);
		expect(result).toEqual({ path: 'post-1/a.gif', mime: 'image/gif' });
		expect(download).not.toHaveBeenCalled();
	});
});
