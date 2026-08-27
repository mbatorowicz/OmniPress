import { describe, expect, it, vi } from 'vitest';
import { generateCspNonce } from './nonce';

describe('generateCspNonce', () => {
	it('koduje dokładnie 16 bajtów entropii', () => {
		expect(Buffer.from(generateCspNonce(), 'base64')).toHaveLength(16);
	});

	it('zwraca poprawny base64 (nonce trafia wprost do nagłówka CSP)', () => {
		expect(generateCspNonce()).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
	});

	it('nie powtarza się między wywołaniami', () => {
		const nonces = new Set(Array.from({ length: 200 }, () => generateCspNonce()));
		expect(nonces.size).toBe(200);
	});

	it('czerpie z crypto.getRandomValues, nie z Math.random', () => {
		const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
		generateCspNonce();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0]![0]).toBeInstanceOf(Uint8Array);
		spy.mockRestore();
	});

	it('koduje bajty spoza ASCII bez utraty informacji', () => {
		const spy = vi
			.spyOn(globalThis.crypto, 'getRandomValues')
			.mockImplementation(((bytes: Uint8Array) => {
				bytes.set(Uint8Array.from({ length: 16 }, (_, i) => 240 + (i % 16)));
				return bytes;
			}) as typeof crypto.getRandomValues);
		const decoded = Buffer.from(generateCspNonce(), 'base64');
		expect([...decoded]).toEqual(Array.from({ length: 16 }, (_, i) => 240 + (i % 16)));
		spy.mockRestore();
	});
});
