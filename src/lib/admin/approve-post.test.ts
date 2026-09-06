import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake, hasEq, updatePayloads } from '@/lib/testing/supabase-fake';
import type { PostRow } from '@/lib/posts';

const resolveSitePublishDestinationIds = vi.hoisted(() => vi.fn());
vi.mock('./sites', () => ({ resolveSitePublishDestinationIds }));

const schedulePublishWorker = vi.hoisted(() => vi.fn());
vi.mock('@/lib/publish/trigger-worker', () => ({ schedulePublishWorker }));

vi.mock('@/lib/publish/withdraw', () => ({
	postsWithLivePublishLogs: vi.fn(async () => false),
	withdrawPostsFromRemoteBatch: vi.fn(async () => ({ remoteErrors: [] })),
}));

const { approvePost } = await import('./posts');

function post(overrides: Partial<PostRow> = {}): PostRow {
	return {
		id: 'post-1',
		author_id: 'author-1',
		site_id: 'site-1',
		title: 'Komunikat',
		content_md: 'Treść',
		slug: 'komunikat',
		status: 'pending',
		rejection_note: null,
		category_slug: 'aktualnosci',
		category_name: 'Aktualności',
		extra_category_slugs: [],
		scheduled_publish_at: null,
		pinned: false,
		...overrides,
	};
}

beforeEach(() => {
	resolveSitePublishDestinationIds.mockReset();
	resolveSitePublishDestinationIds.mockResolvedValue(['dest-1']);
	schedulePublishWorker.mockReset();
});

describe('approvePost', () => {
	it('publikuje szkic redaktora bez wysyłania go do akceptacji', async () => {
		const fake = createSupabaseFake();
		const result = await approvePost(fake.client, post({ status: 'draft' }));

		expect(result).toEqual({ ok: true, scheduled: false });
		const payload = updatePayloads(fake, 'posts')[0]!;
		expect(payload.status).toBe('publishing');
		expect(schedulePublishWorker).toHaveBeenCalledOnce();
	});

	it('szkic bez daty publikacji dostaje datę akceptacji (front-matter)', async () => {
		const fake = createSupabaseFake();
		await approvePost(fake.client, post({ status: 'draft', scheduled_publish_at: null }));

		const payload = updatePayloads(fake, 'posts')[0]!;
		expect(typeof payload.scheduled_publish_at).toBe('string');
	});

	it('nie nadpisuje daty ustawionej przez redaktora', async () => {
		const future = new Date(Date.now() + 86_400_000).toISOString();
		const fake = createSupabaseFake();
		const result = await approvePost(fake.client, post({ status: 'draft', scheduled_publish_at: future }));

		expect(result).toEqual({ ok: true, scheduled: true });
		const payload = updatePayloads(fake, 'posts')[0]!;
		expect(payload.status).toBe('scheduled');
		expect(payload.scheduled_publish_at).toBeUndefined();
		expect(schedulePublishWorker).not.toHaveBeenCalled();
	});

	it('warunkuje zapis statusem odczytanym przed akceptacją', async () => {
		const fake = createSupabaseFake();
		await approvePost(fake.client, post({ status: 'rejected' }));

		const update = fake.calls.find((op) => op.table === 'posts' && op.steps.some((s) => s.method === 'update'))!;
		expect(hasEq(update, 'status', 'rejected')).toBe(true);
	});

	it('odrzuca wpisy, które już poszły na stronę', async () => {
		const fake = createSupabaseFake();
		expect(await approvePost(fake.client, post({ status: 'published' }))).toEqual({
			ok: false,
			error: 'not_approvable',
		});
		expect(await approvePost(fake.client, post({ status: 'publishing' }))).toEqual({
			ok: false,
			error: 'not_approvable',
		});
	});

	it('nie publikuje szkicu bez tytułu ani bez kategorii', async () => {
		const fake = createSupabaseFake();
		expect(await approvePost(fake.client, post({ status: 'draft', title: '' }))).toEqual({
			ok: false,
			error: 'title_required',
		});
		expect(
			await approvePost(fake.client, post({ status: 'draft', category_slug: null })),
		).toEqual({ ok: false, error: 'category_required' });
		expect(resolveSitePublishDestinationIds).not.toHaveBeenCalled();
	});

	it('bez kanału publikacji zwraca błąd konfiguracji strony', async () => {
		resolveSitePublishDestinationIds.mockResolvedValue([]);
		const fake = createSupabaseFake();
		expect(await approvePost(fake.client, post({ status: 'draft' }))).toEqual({
			ok: false,
			error: 'no_site_channel',
		});
	});
});
