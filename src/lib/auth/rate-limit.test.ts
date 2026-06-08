import { afterEach, describe, expect, it } from 'vitest';
import { checkAuthRateLimit, resetAuthRateLimitsForTests } from './rate-limit';

function loginRequest(ip = '203.0.113.1'): Request {
	return new Request('https://example.com/api/auth/login', {
		method: 'POST',
		headers: { 'x-forwarded-for': ip },
	});
}

describe('checkAuthRateLimit', () => {
	afterEach(() => {
		resetAuthRateLimitsForTests();
	});

	it('przepuszcza pierwsze żądania', () => {
		expect(checkAuthRateLimit(loginRequest(), 'login').allowed).toBe(true);
	});

	it('blokuje po przekroczeniu limitu', () => {
		for (let i = 0; i < 20; i++) {
			expect(checkAuthRateLimit(loginRequest(), 'login').allowed).toBe(true);
		}
		const blocked = checkAuthRateLimit(loginRequest(), 'login');
		expect(blocked.allowed).toBe(false);
		if (!blocked.allowed) {
			expect(blocked.retryAfterSec).toBeGreaterThan(0);
		}
	});
});
