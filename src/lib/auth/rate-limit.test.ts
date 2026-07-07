import { afterEach, describe, expect, it } from 'vitest';
import {
	AUTH_RATE_LIMIT_MAX,
	checkAuthRateLimit,
	resetAuthRateLimitsForTests,
} from './rate-limit';
import { resetMemoryRateLimitStoreForTests } from './rate-limit-store';

function loginRequest(ip = '203.0.113.1'): Request {
	return new Request('https://example.com/api/auth/login', {
		method: 'POST',
		headers: { 'x-real-ip': ip },
	});
}

describe('checkAuthRateLimit', () => {
	afterEach(() => {
		resetAuthRateLimitsForTests();
		resetMemoryRateLimitStoreForTests();
	});

	it('przepuszcza pierwsze żądania', async () => {
		expect((await checkAuthRateLimit(loginRequest(), 'login')).allowed).toBe(true);
	});

	it('blokuje po przekroczeniu limitu', async () => {
		for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i++) {
			expect((await checkAuthRateLimit(loginRequest(), 'login')).allowed).toBe(true);
		}
		const blocked = await checkAuthRateLimit(loginRequest(), 'login');
		expect(blocked.allowed).toBe(false);
		if (!blocked.allowed) {
			expect(blocked.retryAfterSec).toBeGreaterThan(0);
		}
	});

	it('używa x-real-ip przed x-forwarded-for', async () => {
		const req = new Request('https://example.com/api/auth/login', {
			method: 'POST',
			headers: {
				'x-real-ip': '198.51.100.9',
				'x-forwarded-for': '203.0.113.1',
			},
		});
		for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i++) {
			await checkAuthRateLimit(req, 'login');
		}
		expect((await checkAuthRateLimit(loginRequest('203.0.113.1'), 'login')).allowed).toBe(true);
		expect((await checkAuthRateLimit(req, 'login')).allowed).toBe(false);
	});
});
