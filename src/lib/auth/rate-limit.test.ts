import { afterEach, describe, expect, it } from 'vitest';
import {
	AUTH_RATE_LIMIT_MAX,
	checkAuthRateLimit,
	clientIp,
	resetAuthRateLimitsForTests,
} from './rate-limit';
import { resetMemoryRateLimitStoreForTests } from './rate-limit-store';

function loginRequest(headers: Record<string, string>): Request {
	return new Request('https://example.com/api/auth/login', {
		method: 'POST',
		headers,
	});
}

describe('clientIp', () => {
	it('na Vercel bierze hop platformy, nie x-real-ip od klienta', () => {
		expect(
			clientIp(
				loginRequest({
					'x-real-ip': '203.0.113.1',
					'x-forwarded-for': '198.51.100.9',
					'x-vercel-forwarded-for': '192.0.2.44',
				}),
			),
		).toBe('192.0.2.44');
	});

	it('bez nagłówka Vercel bierze pierwszy hop X-Forwarded-For', () => {
		expect(
			clientIp(
				loginRequest({
					'x-real-ip': '203.0.113.1',
					'x-forwarded-for': '198.51.100.9, 10.0.0.1',
				}),
			),
		).toBe('198.51.100.9');
	});

	it('nie ufa samemu x-real-ip', () => {
		expect(clientIp(loginRequest({ 'x-real-ip': '203.0.113.1' }))).toBe('unknown');
	});
});

describe('checkAuthRateLimit', () => {
	afterEach(() => {
		resetAuthRateLimitsForTests();
		resetMemoryRateLimitStoreForTests();
	});

	it('przepuszcza pierwsze żądania', async () => {
		expect(
			(await checkAuthRateLimit(loginRequest({ 'x-forwarded-for': '203.0.113.1' }), 'login'))
				.allowed,
		).toBe(true);
	});

	it('blokuje po przekroczeniu limitu', async () => {
		const req = loginRequest({ 'x-forwarded-for': '203.0.113.1' });
		for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i++) {
			expect((await checkAuthRateLimit(req, 'login')).allowed).toBe(true);
		}
		const blocked = await checkAuthRateLimit(req, 'login');
		expect(blocked.allowed).toBe(false);
		if (!blocked.allowed) {
			expect(blocked.retryAfterSec).toBeGreaterThan(0);
		}
	});

	it('rozdziela budżet po hopie Vercel, nie po x-real-ip', async () => {
		const spoofed = loginRequest({
			'x-real-ip': '198.51.100.9',
			'x-vercel-forwarded-for': '203.0.113.1',
		});
		for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i++) {
			await checkAuthRateLimit(spoofed, 'login');
		}
		expect(
			(await checkAuthRateLimit(loginRequest({ 'x-real-ip': '198.51.100.9' }), 'login'))
				.allowed,
		).toBe(true);
		expect((await checkAuthRateLimit(spoofed, 'login')).allowed).toBe(false);
	});
});
