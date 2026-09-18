import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '@/lib/testing/fetch-fake';
import { getReceivedEmail, RESEND_RECEIVING_BASE, RESEND_TIMEOUT_MS } from './receiving';

const EMAIL_ID = '4ef9a417-02e9-4d39-ad75-9611e0fcc33c';
const API_KEY = 're_test_key';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('getReceivedEmail', () => {
	it('woła GET receiving z Bearer i mapuje pola bez rzucania ciała', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				id: EMAIL_ID,
				from: 'jan@urzad.pl',
				subject: 'Festyn',
				text: 'Zapraszamy.',
				html: '<p>Zapraszamy.</p>',
			}),
		);

		await expect(
			getReceivedEmail(EMAIL_ID, { apiKey: ` ${API_KEY} `, fetch: fetchMock as typeof fetch }),
		).resolves.toEqual({
			id: EMAIL_ID,
			from: 'jan@urzad.pl',
			subject: 'Festyn',
			text: 'Zapraszamy.',
			html: '<p>Zapraszamy.</p>',
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`${RESEND_RECEIVING_BASE}/${EMAIL_ID}?html_format=cid`);
		expect(init.method).toBe('GET');
		expect(init.headers).toEqual({ Authorization: `Bearer ${API_KEY}` });
	});

	it('zwraca null przy braku klucza, błędzie HTTP i timeoutcie', async () => {
		const fetchMock = vi.fn();
		await expect(
			getReceivedEmail(EMAIL_ID, { apiKey: '', fetch: fetchMock as typeof fetch }),
		).resolves.toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();

		fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));
		await expect(
			getReceivedEmail(EMAIL_ID, { apiKey: API_KEY, fetch: fetchMock as typeof fetch }),
		).resolves.toBeNull();

		const hanging = vi.fn((_url: string, init?: RequestInit) => {
			return new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener('abort', () => {
					reject(new DOMException('Aborted', 'AbortError'));
				});
			});
		});
		await expect(
			getReceivedEmail(EMAIL_ID, {
				apiKey: API_KEY,
				fetch: hanging as typeof fetch,
				timeoutMs: 5,
			}),
		).resolves.toBeNull();
		expect(RESEND_TIMEOUT_MS).toBeGreaterThan(0);
	});
});
