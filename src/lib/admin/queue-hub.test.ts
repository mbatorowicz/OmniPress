import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake, hasEq, opsFor, stepArgs } from '@/lib/testing/supabase-fake';

const listSites = vi.hoisted(() => vi.fn());
vi.mock('@/lib/admin/sites', () => ({ listSites }));

const { loadAdminQueueHub } = await import('./queue-hub');

describe('loadAdminQueueHub', () => {
	beforeEach(() => {
		listSites.mockReset();
		listSites.mockResolvedValue([]);
	});

	it('sekcja Na stronie sortuje po dacie publikacji, nie po ostatniej zmianie', async () => {
		const fake = createSupabaseFake(() => ({ data: [] }));
		await loadAdminQueueHub(fake.client, null);

		const published = opsFor(fake, 'posts').find((op) => hasEq(op, 'status', 'published'));
		expect(published).toBeTruthy();
		expect(stepArgs(published!, 'order')).toEqual([
			'scheduled_publish_at',
			{ ascending: false, nullsFirst: false },
		]);
		expect(stepArgs(published!, 'limit')).toEqual([30]);
	});
});
