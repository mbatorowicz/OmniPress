import { describe, expect, it, vi } from 'vitest';
import type { PostRow } from '@/lib/posts';
import { approvePendingFromTelegram } from './telegram-approve';

const POST_ID = '11111111-2222-3333-4444-555555555555';

function post(status: PostRow['status']): PostRow {
	return {
		id: POST_ID,
		author_id: 'author-1',
		site_id: 'site-1',
		title: 'Komunikat',
		content_md: 'Treść',
		slug: 'komunikat',
		status,
		rejection_note: null,
		category_slug: 'aktualnosci',
		category_name: 'Aktualności',
		extra_category_slugs: [],
		scheduled_publish_at: null,
		pinned: false,
	};
}

describe('approvePendingFromTelegram', () => {
	it('nie publikuje szkicu — tylko pending', async () => {
		const approve = vi.fn();
		const result = await approvePendingFromTelegram(POST_ID, {
			supabase: {} as never,
			getPost: async () => post('draft'),
			approve,
		});
		expect(result).toEqual({ ok: false, error: 'not_pending' });
		expect(approve).not.toHaveBeenCalled();
	});

	it('zwraca not_found gdy wpis znika', async () => {
		const result = await approvePendingFromTelegram(POST_ID, {
			supabase: {} as never,
			getPost: async () => null,
			approve: vi.fn(),
		});
		expect(result).toEqual({ ok: false, error: 'not_found' });
	});

	it('woła approvePost dla pending', async () => {
		const pending = post('pending');
		const approve = vi.fn().mockResolvedValue({ ok: true, scheduled: false });
		const result = await approvePendingFromTelegram(POST_ID, {
			supabase: {} as never,
			getPost: async () => pending,
			approve,
		});
		expect(result).toEqual({ ok: true, scheduled: false });
		expect(approve).toHaveBeenCalledWith({}, pending);
	});
});
