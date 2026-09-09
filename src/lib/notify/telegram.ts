export const TELEGRAM_TIMEOUT_MS = 3000;

export type TelegramConfig = {
	token: string;
	chatId: string;
};

export type TelegramInlineButton =
	| { text: string; callback_data: string }
	| { text: string; url: string };

export type TelegramReplyMarkup = {
	inline_keyboard: TelegramInlineButton[][];
};

export type TelegramCallOptions = {
	fetch?: typeof fetch;
	config?: TelegramConfig | null;
	timeoutMs?: number;
};

export type SendTelegramOptions = TelegramCallOptions & {
	replyMarkup?: TelegramReplyMarkup;
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

export async function callTelegramApi(
	method: string,
	body: Record<string, unknown>,
	opts: TelegramCallOptions = {},
): Promise<void> {
	const config = opts.config !== undefined ? opts.config : readTelegramConfig();
	if (!config) return;

	const doFetch = opts.fetch ?? fetch;
	const timeoutMs = opts.timeoutMs ?? TELEGRAM_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		await doFetch(`https://api.telegram.org/bot${config.token}/${method}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: controller.signal,
		});
	} catch {
		// Awaria Telegrama nie cofa submitu ani akceptacji.
	} finally {
		clearTimeout(timer);
	}
}

export async function sendTelegramMessage(
	text: string,
	opts: SendTelegramOptions = {},
): Promise<void> {
	const config = opts.config !== undefined ? opts.config : readTelegramConfig();
	if (!config || !text.trim()) return;

	await callTelegramApi(
		'sendMessage',
		{
			chat_id: config.chatId,
			text,
			disable_web_page_preview: true,
			...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
		},
		{ ...opts, config },
	);
}

export async function answerTelegramCallback(
	callbackQueryId: string,
	text: string,
	showAlert: boolean,
	opts: TelegramCallOptions = {},
): Promise<void> {
	await callTelegramApi(
		'answerCallbackQuery',
		{
			callback_query_id: callbackQueryId,
			text,
			show_alert: showAlert,
		},
		opts,
	);
}

export async function editTelegramMessage(
	input: {
		chatId: string;
		messageId: number;
		text: string;
		replyMarkup?: TelegramReplyMarkup;
	},
	opts: TelegramCallOptions = {},
): Promise<void> {
	await callTelegramApi(
		'editMessageText',
		{
			chat_id: input.chatId,
			message_id: input.messageId,
			text: input.text,
			disable_web_page_preview: true,
			reply_markup: input.replyMarkup ?? { inline_keyboard: [] },
		},
		opts,
	);
}
