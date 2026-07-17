import { createHash } from 'node:crypto';

/** SHA-1 bloba Gita (`blob <size>\0<content>`) — ten sam co Contents API `sha`. */
export function gitBlobShaFromBytes(content: ArrayBuffer | Uint8Array): string {
	const bytes =
		content instanceof ArrayBuffer
			? new Uint8Array(content)
			: new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
	const header = Buffer.from(`blob ${bytes.byteLength}\0`);
	return createHash('sha1').update(header).update(bytes).digest('hex');
}

export function gitBlobShaFromText(text: string): string {
	return gitBlobShaFromBytes(new TextEncoder().encode(text));
}
