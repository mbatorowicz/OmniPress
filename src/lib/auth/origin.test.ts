import { describe, expect, it } from 'vitest';
import { isCrossOriginPost } from './origin';

describe('isCrossOriginPost', () => {
	it('zwraca false bez nagłówka Origin', () => {
		const req = new Request('https://omni-press.vercel.app/api/auth/login', { method: 'POST' });
		expect(isCrossOriginPost(req)).toBe(false);
	});

	it('zwraca false dla tej samej domeny', () => {
		const req = new Request('https://omni-press.vercel.app/api/auth/login', {
			method: 'POST',
			headers: {
				Origin: 'https://omni-press.vercel.app',
				Host: 'omni-press.vercel.app',
			},
		});
		expect(isCrossOriginPost(req)).toBe(false);
	});

	it('zwraca true dla obcej domeny', () => {
		const req = new Request('https://omni-press.vercel.app/api/auth/signout', {
			method: 'POST',
			headers: {
				Origin: 'https://evil.example',
				Host: 'omni-press.vercel.app',
			},
		});
		expect(isCrossOriginPost(req)).toBe(true);
	});
});
