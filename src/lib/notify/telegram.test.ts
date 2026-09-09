import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTelegramConfig, sendTelegramMessage, TELEGRAM_TIMEOUT_MS } from './telegram';

const CONFIG = { token: 'test-token', chatId: '12345' };

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('readTelegramConfig', () => {
	it('zwraca null bez tokenu albo chat_id', () => {
		vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
		vi.stubEnv('TELEGRAM_CHAT_ID', '1');
		expect(readTelegramConfig()).toBeNull();

		vi.stubEnv('TELEGRAM_BOT_TOKEN', 'tok');
		vi.stubEnv('TELEGRAM_CHAT_ID', '');
		expect(readTelegramConfig()).toBeNull();
	});

	it('czyta token i chat_id z env', () => {
		vi.stubEnv('TELEGRAM_BOT_TOKEN', ' tok ');
		vi.stubEnv('TELEGRAM_CHAT_ID', ' 99 ');
		expect(readTelegramConfig()).toEqual({ token: 'tok', chatId: '99' });
	});
});

describe('sendTelegramMessage', () => {
	it('nie woła API bez konfiguracji', async () => {
		const fetchMock = vi.fn();
		await sendTelegramMessage('tekst', { fetch: fetchMock, config: null });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('nie woła API bez treści', async () => {
		const fetchMock = vi.fn();
		await sendTelegramMessage('  ', { fetch: fetchMock, config: CONFIG });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('wysyła zwykły tekst na sendMessage', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		await sendTelegramMessage('Wpis do akceptacji', { fetch: fetchMock, config: CONFIG });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({
			chat_id: '12345',
			text: 'Wpis do akceptacji',
			disable_web_page_preview: true,
		});
	});

	it('nie rzuca przy błędzie HTTP', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('fail', { status: 500 }));
		await expect(
			sendTelegramMessage('x', { fetch: fetchMock, config: CONFIG }),
		).resolves.toBeUndefined();
	});

	it('nie rzuca przy timeoutcie', async () => {
		const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
			return new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener('abort', () => {
					reject(new DOMException('Aborted', 'AbortError'));
				});
			});
		});

		await expect(
			sendTelegramMessage('x', {
				fetch: fetchMock as typeof fetch,
				config: CONFIG,
				timeoutMs: 10,
			}),
		).resolves.toBeUndefined();
		expect(TELEGRAM_TIMEOUT_MS).toBe(3000);
	});

	it('no-op gdy brak env (bez opts.config)', async () => {
		vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
		vi.stubEnv('TELEGRAM_CHAT_ID', '');
		const fetchMock = vi.fn();
		await sendTelegramMessage('x', { fetch: fetchMock });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
