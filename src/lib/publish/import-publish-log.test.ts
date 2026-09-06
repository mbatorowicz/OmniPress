import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import { ensureSuccessPublishLog } from './import-publish-log';

describe('ensureSuccessPublishLog', () => {
	it('nie nadpisuje starszej daty pierwszej publikacji', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'publish_logs' && op.steps.some((step) => step.method === 'select')) {
				return { data: { id: 'log-1', published_at: '2024-09-03T08:00:00.000Z' } };
			}
			return { data: { id: 'log-1' } };
		});

		await ensureSuccessPublishLog(
			fake.client,
			'post-1',
			'dest-1',
			'github:src/content/news/wpis/index.md',
			'2026-09-06T12:00:00.000Z',
		);

		const patch = stepArgs(
			fake.calls.find((op) => op.table === 'publish_logs' && op.steps.some((s) => s.method === 'update'))!,
			'update',
		)?.[0] as Record<string, unknown>;
		expect(patch.published_at).toBe('2024-09-03T08:00:00.000Z');
		expect(hasEq(fake.calls[0]!, 'post_id', 'post-1')).toBe(true);
	});

	it('uzupelnia published_at gdy log nie mial daty', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'publish_logs' && op.steps.some((step) => step.method === 'select')) {
				return { data: { id: 'log-1', published_at: null } };
			}
			return { data: { id: 'log-1' } };
		});

		await ensureSuccessPublishLog(fake.client, 'post-1', 'dest-1', 'ext', '2026-08-11');

		const patch = stepArgs(
			fake.calls.find((op) => op.table === 'publish_logs' && op.steps.some((s) => s.method === 'update'))!,
			'update',
		)?.[0] as Record<string, unknown>;
		expect(patch.published_at).toBe('2026-08-11');
	});
});
