import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '@/lib/testing/fetch-fake';
import { RESEND_RECEIVING_BASE } from './receiving';
import { downloadReceivedAttachment, listReceivedAttachments } from './receiving-attachments';

const EMAIL_ID = '4ef9a417-02e9-4d39-ad75-9611e0fcc33c';
const API_KEY = 're_test_key';
const FILE_URL = 'https://inbound-cdn.resend.com/att?sig=1';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('listReceivedAttachments', () => {
	it('woła GET attachments z Bearer i mapuje download_url', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				data: [
					{
						id: 'att-1',
						filename: 'avatar.png',
						size: 12,
						content_type: 'image/png',
						download_url: FILE_URL,
					},
				],
			}),
		);

		await expect(
			listReceivedAttachments(EMAIL_ID, { apiKey: ` ${API_KEY} `, fetch: fetchMock as typeof fetch }),
		).resolves.toEqual([
			{
				id: 'att-1',
				filename: 'avatar.png',
				size: 12,
				contentType: 'image/png',
				downloadUrl: FILE_URL,
			},
		]);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`${RESEND_RECEIVING_BASE}/${EMAIL_ID}/attachments`);
		expect(init.headers).toEqual({ Authorization: `Bearer ${API_KEY}` });
	});

	it('zwraca null przy braku klucza i bledzie HTTP', async () => {
		const fetchMock = vi.fn();
		await expect(
			listReceivedAttachments(EMAIL_ID, { apiKey: '', fetch: fetchMock as typeof fetch }),
		).resolves.toBeNull();
		fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
		await expect(
			listReceivedAttachments(EMAIL_ID, { apiKey: API_KEY, fetch: fetchMock as typeof fetch }),
		).resolves.toBeNull();
	});
});

describe('downloadReceivedAttachment', () => {
	it('pobiera bajty; za duzy Content-Length i timeout to skip, nie wyjatek', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(new Uint8Array([1, 2, 3]), {
				status: 200,
				headers: { 'Content-Type': 'image/png' },
			}),
		);
		await expect(
			downloadReceivedAttachment(FILE_URL, { maxBytes: 10, fetch: fetchMock as typeof fetch }),
		).resolves.toEqual({ ok: true, bytes: new Uint8Array([1, 2, 3]) });

		fetchMock.mockResolvedValue(
			new Response(null, { status: 200, headers: { 'Content-Length': '99' } }),
		);
		await expect(
			downloadReceivedAttachment(FILE_URL, { maxBytes: 10, fetch: fetchMock as typeof fetch }),
		).resolves.toEqual({ ok: false, reason: 'too_large' });

		const hanging = vi.fn((_url: string, init?: RequestInit) => {
			return new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener('abort', () => {
					reject(new DOMException('Aborted', 'AbortError'));
				});
			});
		});
		await expect(
			downloadReceivedAttachment(FILE_URL, {
				maxBytes: 10,
				fetch: hanging as typeof fetch,
				timeoutMs: 5,
			}),
		).resolves.toEqual({ ok: false, reason: 'fetch_failed' });
	});
});
