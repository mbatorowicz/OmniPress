import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret: string): Buffer {
	const bytes: number[] = [];
	let buffer = 0;
	let bits = 0;
	for (const char of secret.replace(/[\s=]/g, '').toUpperCase()) {
		const index = BASE32_ALPHABET.indexOf(char);
		if (index === -1) continue;
		buffer = (buffer << 5) | index;
		bits += 5;
		if (bits >= 8) {
			bytes.push((buffer >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}
	return Buffer.from(bytes);
}

/** Kod TOTP (RFC 6238, SHA-1 / 30 s / 6 cyfr) — zgodny z Supabase MFA. */
export function generateTotp(secret: string, now: number = Date.now()): string {
	const counter = Math.floor(now / 1000 / 30);
	const counterBuffer = Buffer.alloc(8);
	counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
	counterBuffer.writeUInt32BE(counter % 2 ** 32, 4);

	const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
	const offset = digest[digest.length - 1] & 0x0f;
	const binary =
		((digest[offset] & 0x7f) << 24) |
		(digest[offset + 1] << 16) |
		(digest[offset + 2] << 8) |
		digest[offset + 3];

	return String(binary % 1_000_000).padStart(6, '0');
}
