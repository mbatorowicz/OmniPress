import { describe, expect, it } from 'vitest';
import { authCodeRedirectTarget, isPasswordRecoveryRedirect } from './recovery-redirect';

describe('isPasswordRecoveryRedirect', () => {
	it('type=recovery', () => {
		expect(
			isPasswordRecoveryRedirect(new URL('https://x.app/login?type=recovery&code=abc')),
		).toBe(true);
	});

	it('/login?mode=reset', () => {
		expect(isPasswordRecoveryRedirect(new URL('https://x.app/login?mode=reset&code=abc'))).toBe(
			true,
		);
	});

	it('zwykły login z code — nie recovery', () => {
		expect(isPasswordRecoveryRedirect(new URL('https://x.app/login?code=abc'))).toBe(false);
	});
});

describe('authCodeRedirectTarget', () => {
	it('nie przechwytuje /auth/callback', () => {
		expect(
			authCodeRedirectTarget(new URL('https://x.app/auth/callback?code=abc')),
		).toBeNull();
	});

	it('recovery na / → reset-password', () => {
		expect(
			authCodeRedirectTarget(new URL('https://x.app/?type=recovery&code=abc')),
		).toBe('/auth/reset-password?code=abc');
	});

	it('magic link na / → callback', () => {
		expect(authCodeRedirectTarget(new URL('https://x.app/?code=abc'))).toBe(
			'/auth/callback?code=abc',
		);
	});

	it('/login?mode=reset → reset-password', () => {
		expect(
			authCodeRedirectTarget(new URL('https://x.app/login?mode=reset&code=abc')),
		).toBe('/auth/reset-password?code=abc');
	});
});
