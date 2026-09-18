import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	SVIX_ID_HEADER,
	SVIX_SIGNATURE_HEADER,
	SVIX_TIMESTAMP_HEADER,
	authorizeInboundWebhook,
} from './webhook-auth';

/** Przykład z dokumentacji Svix — wektor znany, nie losowy HMAC. */
const SVIX_EXAMPLE = {
	secret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
	id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
	timestamp: '1614265330',
	body: '{"test": 2432232314}',
	signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
} as const;

const NOW = Number(SVIX_EXAMPLE.timestamp);

function sign(secret: string, id: string, timestamp: string, body: string): string {
	const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
	const digest = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
	return `v1,${digest}`;
}

function headers(init: {
	id?: string;
	timestamp?: string;
	signature?: string;
} = {}): Headers {
	const h = new Headers();
	if (init.id !== undefined) h.set(SVIX_ID_HEADER, init.id);
	if (init.timestamp !== undefined) h.set(SVIX_TIMESTAMP_HEADER, init.timestamp);
	if (init.signature !== undefined) h.set(SVIX_SIGNATURE_HEADER, init.signature);
	return h;
}

function signedHeaders(
	body = SVIX_EXAMPLE.body,
	overrides: { id?: string; timestamp?: string; secret?: string } = {},
): Headers {
	const id = overrides.id ?? SVIX_EXAMPLE.id;
	const timestamp = overrides.timestamp ?? SVIX_EXAMPLE.timestamp;
	const secret = overrides.secret ?? SVIX_EXAMPLE.secret;
	return headers({
		id,
		timestamp,
		signature: sign(secret, id, timestamp, body),
	});
}

describe('authorizeInboundWebhook', () => {
	it('przepuszcza wektor Svix w oknie czasowym', () => {
		expect(
			authorizeInboundWebhook(
				headers({
					id: SVIX_EXAMPLE.id,
					timestamp: SVIX_EXAMPLE.timestamp,
					signature: SVIX_EXAMPLE.signature,
				}),
				SVIX_EXAMPLE.body,
				SVIX_EXAMPLE.secret,
				NOW,
			),
		).toBe(true);
	});

	it('odrzuca brak sekretu, pusty sekret i zły podpis', () => {
		const h = signedHeaders();
		expect(authorizeInboundWebhook(h, SVIX_EXAMPLE.body, '', NOW)).toBe(false);
		expect(authorizeInboundWebhook(h, SVIX_EXAMPLE.body, 'whsec_', NOW)).toBe(false);
		expect(
			authorizeInboundWebhook(
				headers({
					id: SVIX_EXAMPLE.id,
					timestamp: SVIX_EXAMPLE.timestamp,
					signature: 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
				}),
				SVIX_EXAMPLE.body,
				SVIX_EXAMPLE.secret,
				NOW,
			),
		).toBe(false);
	});

	it('odrzuca brak nagłówków Svix i zniekształcone ciało', () => {
		expect(authorizeInboundWebhook(new Headers(), SVIX_EXAMPLE.body, SVIX_EXAMPLE.secret, NOW)).toBe(
			false,
		);
		expect(
			authorizeInboundWebhook(signedHeaders(), `${SVIX_EXAMPLE.body} `, SVIX_EXAMPLE.secret, NOW),
		).toBe(false);
	});

	it('odrzuca timestamp poza tolerancją (replay)', () => {
		expect(
			authorizeInboundWebhook(signedHeaders(), SVIX_EXAMPLE.body, SVIX_EXAMPLE.secret, NOW + 301),
		).toBe(false);
	});

	it('akceptuje jedną poprawną sygnaturę v1 spośród kilku', () => {
		const good = sign(
			SVIX_EXAMPLE.secret,
			SVIX_EXAMPLE.id,
			SVIX_EXAMPLE.timestamp,
			SVIX_EXAMPLE.body,
		);
		const mixed = headers({
			id: SVIX_EXAMPLE.id,
			timestamp: SVIX_EXAMPLE.timestamp,
			signature: `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${good}`,
		});
		expect(authorizeInboundWebhook(mixed, SVIX_EXAMPLE.body, SVIX_EXAMPLE.secret, NOW)).toBe(true);
	});
});
