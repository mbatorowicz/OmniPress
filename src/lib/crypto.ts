/**
 * Szyfrowanie credentials destynacji (Faza 3–4).
 * Wymaga ENCRYPTION_KEY (32 bajty, base64) na serwerze Vercel.
 */

// Parametr generyczny jest wymagany: WebCrypto przyjmuje BufferSource nad ArrayBuffer,
// a goły `Uint8Array` domyślnie obejmuje też SharedArrayBuffer.
function getKeyBytes(): Uint8Array<ArrayBuffer> | null {
	const raw = import.meta.env.ENCRYPTION_KEY;
	if (!raw) return null;
	const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
	if (bytes.length !== 32) {
		throw new Error('ENCRYPTION_KEY musi mieć 32 bajty po dekodowaniu base64');
	}
	return bytes;
}

export function canEncryptCredentials(): boolean {
	return getKeyBytes() !== null;
}

export async function encryptSecret(plain: string): Promise<string> {
	const key = getKeyBytes();
	if (!key) {
		throw new Error('ENCRYPTION_KEY nie jest ustawiony');
	}
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(plain);
	const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
	const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
	const combined = new Uint8Array(iv.length + cipher.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(cipher), iv.length);
	return btoa(String.fromCharCode(...combined));
}

export async function decryptSecret(payload: string): Promise<string> {
	const key = getKeyBytes();
	if (!key) {
		throw new Error('ENCRYPTION_KEY nie jest ustawiony');
	}
	const combined = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const data = combined.slice(12);
	const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
	return new TextDecoder().decode(plain);
}
