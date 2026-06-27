import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex, sha256HexPrefix } from './sha256-hex';

describe('sha256-hex', () => {
	it('zwraca ten sam skrót co node:crypto', () => {
		const input = 'OmniPress layout payload test';
		const expected = createHash('sha256').update(input).digest('hex');
		expect(sha256Hex(input)).toBe(expected);
		expect(sha256HexPrefix(input, 16)).toBe(expected.slice(0, 16));
	});
});
