import { describe, expect, it } from 'vitest';
import { applySecurityHeaders } from './headers';

describe('applySecurityHeaders', () => {
	it('dodaje CSP z nonce i Supabase', () => {
		const res = applySecurityHeaders(new Response('ok'), {
			cspNonce: 'abc123',
			supabaseUrl: 'https://xyz.supabase.co',
		});
		const csp = res.headers.get('Content-Security-Policy');
		expect(csp).toContain("script-src 'self' 'nonce-abc123' 'wasm-unsafe-eval'");
		expect(csp).toContain('https://xyz.supabase.co');
		expect(csp).toContain("object-src 'none'");
	});

	it('nie dodaje CSP bez nonce', () => {
		const res = applySecurityHeaders(new Response('ok'), {});
		expect(res.headers.get('Content-Security-Policy')).toBeNull();
	});
});
