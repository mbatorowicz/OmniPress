import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gitBlobShaFromBytes, gitBlobShaFromText } from './git-blob';

describe('gitBlobSha', () => {
	it('tekst: zgodny z ręcznym SHA-1 nagłówka blob', () => {
		const text = 'hello\n';
		const bytes = Buffer.from(text, 'utf8');
		const expected = createHash('sha1')
			.update(Buffer.from(`blob ${bytes.byteLength}\0`))
			.update(bytes)
			.digest('hex');
		expect(gitBlobShaFromText(text)).toBe(expected);
		expect(gitBlobShaFromBytes(bytes)).toBe(expected);
	});

	it('binaria: ten sam skrót dla ArrayBuffer i Uint8Array', () => {
		const u8 = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
		const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
		expect(gitBlobShaFromBytes(u8)).toBe(gitBlobShaFromBytes(ab));
	});
});
