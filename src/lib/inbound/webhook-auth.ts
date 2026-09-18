import { createHmac, timingSafeEqual } from 'node:crypto';
import { jsonOk } from '@/lib/api/response';

export const SVIX_ID_HEADER = 'svix-id';
export const SVIX_TIMESTAMP_HEADER = 'svix-timestamp';
export const SVIX_SIGNATURE_HEADER = 'svix-signature';
/** Domyślna tolerancja Svix — odrzut replay poza oknem. */
export const SVIX_TIMESTAMP_TOLERANCE_SEC = 300;

export type InboundWebhookDeps = {
	secret?: string | null;
	nowSec?: number;
};

export function inboundWebhookSecret(): string {
	return import.meta.env.RESEND_WEBHOOK_SECRET?.trim() ?? '';
}

function decodeSecret(secret: string): Buffer | null {
	const payload = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
	if (!payload) return null;
	const bytes = Buffer.from(payload, 'base64');
	return bytes.length > 0 ? bytes : null;
}

function timestampInWindow(raw: string, nowSec: number): boolean {
	if (!/^[0-9]+$/.test(raw)) return false;
	return Math.abs(nowSec - Number(raw)) <= SVIX_TIMESTAMP_TOLERANCE_SEC;
}

function hasMatchingV1Signature(expected: Buffer, header: string): boolean {
	for (const part of header.split(/\s+/)) {
		if (!part.startsWith('v1,')) continue;
		const provided = Buffer.from(part.slice(3), 'base64');
		if (provided.length !== expected.length) continue;
		if (timingSafeEqual(provided, expected)) return true;
	}
	return false;
}

export function authorizeInboundWebhook(
	headers: Headers,
	rawBody: string,
	secret: string,
	nowSec = Math.floor(Date.now() / 1000),
): boolean {
	if (!secret) return false;
	const key = decodeSecret(secret);
	if (!key) return false;

	const id = headers.get(SVIX_ID_HEADER) ?? '';
	const timestamp = headers.get(SVIX_TIMESTAMP_HEADER) ?? '';
	const signature = headers.get(SVIX_SIGNATURE_HEADER) ?? '';
	if (!id || !timestamp || !signature) return false;
	if (!timestampInWindow(timestamp, nowSec)) return false;

	const expected = createHmac('sha256', key)
		.update(`${id}.${timestamp}.${rawBody}`)
		.digest();
	return hasMatchingV1Signature(expected, signature);
}

export async function handleInboundEmail(
	request: Request,
	deps: InboundWebhookDeps = {},
): Promise<Response> {
	const secret = deps.secret !== undefined ? (deps.secret ?? '') : inboundWebhookSecret();
	const rawBody = await request.text();
	if (!authorizeInboundWebhook(request.headers, rawBody, secret, deps.nowSec)) {
		return new Response('Unauthorized', { status: 401 });
	}
	return jsonOk({ ignored: true });
}
