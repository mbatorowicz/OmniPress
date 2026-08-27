import { vi } from 'vitest';

export type FetchCall = { url: string; method: string; body: unknown };

/** Zwraca odpowiedz dla zadania; undefined = brak trasy (test dostaje blad). */
export type FetchHandler = (call: FetchCall) => Response | undefined;

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function requestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}

function parseBody(body: BodyInit | null | undefined): unknown {
	if (typeof body !== 'string') return body ?? null;
	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
}

/** Podmienia globalny fetch na router sterowany testem; przywraca go vi.restoreAllMocks(). */
export function installFetchFake(handler: FetchHandler): { calls: FetchCall[] } {
	const calls: FetchCall[] = [];

	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const call: FetchCall = {
			url: requestUrl(input),
			method: (init?.method ?? 'GET').toUpperCase(),
			body: parseBody(init?.body),
		};
		calls.push(call);

		const response = handler(call);
		if (!response) {
			throw new Error(`fetch-fake: brak trasy dla ${call.method} ${call.url}`);
		}
		return response;
	});

	return { calls };
}

export function countCalls(calls: FetchCall[], method: string, urlPart: string): number {
	return calls.filter((call) => call.method === method && call.url.includes(urlPart)).length;
}
