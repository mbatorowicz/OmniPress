import { describe, expect, it } from 'vitest';
import { isCrossOriginPost, isPanelMutationPath } from './origin';

function post(headers: Record<string, string> = {}, method = 'POST'): Request {
	return new Request('https://omni-press.vercel.app/api/auth/login', { method, headers });
}

describe('isCrossOriginPost', () => {
	it('odrzuca POST bez Origin i bez Sec-Fetch-Site', () => {
		expect(isCrossOriginPost(post())).toBe(true);
	});

	it('przepuszcza POST bez Origin, gdy Sec-Fetch-Site jest same-origin', () => {
		expect(isCrossOriginPost(post({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(false);
	});

	it('odrzuca POST bez Origin przy Sec-Fetch-Site: cross-site', () => {
		expect(isCrossOriginPost(post({ 'Sec-Fetch-Site': 'cross-site' }))).toBe(true);
	});

	it('przepuszcza tę samą domenę', () => {
		expect(
			isCrossOriginPost(
				post({
					Origin: 'https://omni-press.vercel.app',
					Host: 'omni-press.vercel.app',
				}),
			),
		).toBe(false);
	});

	it('odrzuca obcą domenę', () => {
		expect(
			isCrossOriginPost(
				post({
					Origin: 'https://evil.example',
					Host: 'omni-press.vercel.app',
				}),
			),
		).toBe(true);
	});

	it('odrzuca zepsuty Origin', () => {
		expect(isCrossOriginPost(post({ Origin: 'nie-url', Host: 'omni-press.vercel.app' }))).toBe(
			true,
		);
	});

	it('nie dotyczy GET', () => {
		expect(isCrossOriginPost(post({}, 'GET'))).toBe(false);
	});
});

describe('isPanelMutationPath', () => {
	it('obejmuje mutacje wpisów i administracji', () => {
		expect(isPanelMutationPath('/api/posts/abc/save')).toBe(true);
		expect(isPanelMutationPath('/api/admin/posts')).toBe(true);
	});

	it('nie obejmuje workera ani auth', () => {
		expect(isPanelMutationPath('/api/worker/publish')).toBe(false);
		expect(isPanelMutationPath('/api/auth/login')).toBe(false);
		expect(isPanelMutationPath('/api/telegram/webhook')).toBe(false);
	});
});
