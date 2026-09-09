import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import { countPendingPosts } from './pending-count';

describe('countPendingPosts', () => {
	it('zwraca 0 gdy brak oczekujących', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null, count: 0 }));
		expect(await countPendingPosts(fake.client)).toBe(0);
		expect(hasEq(fake.calls[0]!, 'status', 'pending')).toBe(true);
		expect(stepArgs(fake.calls[0]!, 'select')?.[1]).toEqual({ count: 'exact', head: true });
	});

	it('zwraca liczbę oczekujących', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null, count: 3 }));
		expect(await countPendingPosts(fake.client)).toBe(3);
	});

	it('przy błędzie zwraca 0 zamiast psuć panel', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: { message: 'denied' }, count: 9 }));
		expect(await countPendingPosts(fake.client)).toBe(0);
	});

	it('null z PostgREST traktuje jako 0', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null, count: undefined }));
		expect(await countPendingPosts(fake.client)).toBe(0);
	});
});
