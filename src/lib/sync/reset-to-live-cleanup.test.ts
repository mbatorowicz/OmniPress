import { describe, expect, it } from 'vitest';
import {
	createSupabaseFake,
	opsFor,
	stepArgs,
	updatePayloads,
	type QueryOp,
} from '@/lib/testing/supabase-fake';
import { cancelOpenPublishJobs, deleteOmniOnlyUnpublishedPosts } from './reset-to-live-cleanup';

const SITE = 'site-1';
const LIVE = 'post-live';
const DRAFT = 'post-draft';

function hasMethod(op: QueryOp, method: string): boolean {
	return op.steps.some((step) => step.method === method);
}

describe('cancelOpenPublishJobs', () => {
	it('przywraca log z origin na success, nowy wpis oznacza withdrawn', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'posts') return { data: [{ id: LIVE }, { id: DRAFT }] };
			if (op.table === 'publish_logs' && hasMethod(op, 'select')) {
				return {
					data: [
						{ id: 'log-live', external_id: 'github:src/content/news/a/index.md' },
						{ id: 'log-new', external_id: null },
					],
				};
			}
			return { data: { id: 'ok' } };
		});

		expect(await cancelOpenPublishJobs(fake.client, SITE)).toBe(2);
		const updates = updatePayloads(fake, 'publish_logs');
		expect(updates).toEqual([
			{ status: 'success', next_retry_at: null, retry_count: 0 },
			{ status: 'withdrawn', next_retry_at: null },
		]);
	});
});

describe('deleteOmniOnlyUnpublishedPosts', () => {
	it('kasuje szkic spoza origin, zostawia slug z produkcji', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'posts' && hasMethod(op, 'select') && !hasMethod(op, 'delete')) {
				return {
					data: [
						{ id: LIVE, slug: 'na-stronie' },
						{ id: DRAFT, slug: 'szkic-z-poczty' },
						{ id: 'post-noslug', slug: null },
					],
				};
			}
			if (op.table === 'assets') return { data: [] };
			return { data: null };
		});

		const deleted = await deleteOmniOnlyUnpublishedPosts(
			fake.client,
			SITE,
			new Set(['na-stronie']),
		);
		expect(deleted).toBe(2);
		const del = opsFor(fake, 'posts').find((op) => hasMethod(op, 'delete'));
		expect(stepArgs(del!, 'in')?.[1]).toEqual([DRAFT, 'post-noslug']);
	});
});
