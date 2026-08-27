import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/i18n';
import { guardAuthMutationRequest, guardSameOriginPost } from './guard-request';
import { AUTH_RATE_LIMIT_MAX } from './rate-limit';
import {
	resetMemoryRateLimitStoreForTests,
	setRateLimitStoreForTests,
} from './rate-limit-store';

function post(headers: Record<string, string> = {}): Request {
	return new Request('https://panel.test/api/auth/login', {
		method: 'POST',
		headers: { 'x-real-ip': '203.0.113.7', ...headers },
	});
}

const sameOrigin = { Origin: 'https://panel.test', Host: 'panel.test' };
const crossOrigin = { Origin: 'https://zly.example', Host: 'panel.test' };

afterEach(() => {
	setRateLimitStoreForTests(null);
	resetMemoryRateLimitStoreForTests();
	vi.restoreAllMocks();
});

describe('guardAuthMutationRequest — CSRF', () => {
	it('odrzuca POST z obcego origin', async () => {
		const result = await guardAuthMutationRequest(post(crossOrigin), 'login');
		expect(result).toEqual({
			ok: false,
			status: 403,
			message: auth.supabase.invalidCredentials,
		});
	});

	it('nie zdradza powodu odrzucenia (ten sam komunikat co złe hasło)', async () => {
		const result = await guardAuthMutationRequest(post(crossOrigin), 'login');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toBe(auth.supabase.invalidCredentials);
	});

	it('przepuszcza POST z tego samego origin', async () => {
		expect(await guardAuthMutationRequest(post(sameOrigin), 'login')).toEqual({ ok: true });
	});

	it('przepuszcza POST bez nagłówka Origin (formularz bez JS)', async () => {
		expect(await guardAuthMutationRequest(post(), 'login')).toEqual({ ok: true });
	});

	it('nie zużywa budżetu rate limitu na odrzuconym cross-origin', async () => {
		const increment = vi.fn(async () => ({ allowed: true }) as const);
		setRateLimitStoreForTests({ increment });
		await guardAuthMutationRequest(post(crossOrigin), 'login');
		expect(increment).not.toHaveBeenCalled();
	});
});

describe('guardAuthMutationRequest — rate limit', () => {
	it('zwraca 429 z czasem oczekiwania po przekroczeniu limitu', async () => {
		setRateLimitStoreForTests({
			increment: async () => ({ allowed: false, retryAfterSec: 42 }),
		});
		expect(await guardAuthMutationRequest(post(sameOrigin), 'login')).toEqual({
			ok: false,
			status: 429,
			message: auth.supabase.rateLimit,
			retryAfterSec: 42,
		});
	});

	it('liczy limit osobno dla każdej akcji', async () => {
		for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i++) {
			await guardAuthMutationRequest(post(), 'login');
		}
		expect((await guardAuthMutationRequest(post(), 'login')).ok).toBe(false);
		expect((await guardAuthMutationRequest(post(), 'reset')).ok).toBe(true);
	});
});

describe('guardSameOriginPost', () => {
	it('odrzuca obcy origin', () => {
		expect(guardSameOriginPost(post(crossOrigin))).toEqual({
			ok: false,
			status: 403,
			message: auth.supabase.invalidCredentials,
		});
	});

	it('odrzuca niepoprawny nagłówek Origin', () => {
		expect(guardSameOriginPost(post({ Origin: 'nie-url', Host: 'panel.test' })).ok).toBe(false);
	});

	it('przepuszcza własny origin', () => {
		expect(guardSameOriginPost(post(sameOrigin))).toEqual({ ok: true });
	});

	it('nie sięga po rate limit (wylogowanie nie może się zablokować)', () => {
		const increment = vi.fn(async () => ({ allowed: true }) as const);
		setRateLimitStoreForTests({ increment });
		guardSameOriginPost(post(sameOrigin));
		expect(increment).not.toHaveBeenCalled();
	});
});
