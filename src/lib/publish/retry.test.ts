import { describe, expect, it } from 'vitest';
import { computeNextRetryAt, MAX_PUBLISH_RETRIES, shouldRetry } from './retry';

describe('retry', () => {
	it('backoff rośnie z retry_count', () => {
		const t0 = new Date('2026-06-03T10:00:00Z');
		const t1 = computeNextRetryAt(0, t0)!;
		expect(t1.getTime() - t0.getTime()).toBe(60_000);
		const t2 = computeNextRetryAt(1, t0)!;
		expect(t2.getTime() - t0.getTime()).toBe(5 * 60_000);
	});

	it('po max retry zwraca null', () => {
		expect(computeNextRetryAt(MAX_PUBLISH_RETRIES, new Date())).toBeNull();
		expect(shouldRetry(MAX_PUBLISH_RETRIES)).toBe(false);
	});
});
