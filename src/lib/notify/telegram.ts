export const TELEGRAM_TIMEOUT_MS = 3000;

export type TelegramConfig = {
	token: string;
	chatId: string;
};

export type SendTelegramOptions = {
	fetch?: typeof fetch;
	config?: TelegramConfig | null;
	timeoutMs?: number;
};

export function readTelegramConfig(): TelegramConfig | null {
	const token = import.meta.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
	const chatId = import.meta.env.TELEGRAM_CHAT_ID?.trim() ?? '';
	if (!token || !chatId) return null;
	return { token, chatId };
}

export function isTelegramConfigured(): boolean {
	return readTelegramConfig() !== null;
}

export async function sendTelegramMessage(
	text: string,
	opts: SendTelegramOptions = {},
): Promise<void> {
	const config = opts.config !== undefined ? opts.config : readTelegramConfig();
	if (!config || !text.trim()) return;

	const doFetch = opts.fetch ?? fetch;
	const timeoutMs = opts.timeoutMs ?? TELEGRAM_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		await doFetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: config.chatId,
				text,
				disable_web_page_preview: true,
			}),
			signal: controller.signal,
		});
	} catch {
		// Awaria Telegrama nie cofa submitu.
	} finally {
		clearTimeout(timer);
	}
}
