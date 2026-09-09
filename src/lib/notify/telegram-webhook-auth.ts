import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TelegramConfig } from './telegram';

/** Klucz HMAC — ten sam w `scripts/setup-telegram-webhook.mjs`. */
export const TELEGRAM_WEBHOOK_HMAC_KEY = 'omnipress.telegram.webhook.v1';
export const TELEGRAM_SECRET_HEADER = 'X-Telegram-Bot-Api-Secret-Token';

export function telegramWebhookSecret(botToken: string): string {
	return createHmac('sha256', TELEGRAM_WEBHOOK_HMAC_KEY).update(botToken).digest('hex');
}

function secretsEqual(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function authorizeTelegramWebhook(
	request: Request,
	config: TelegramConfig | null,
): boolean {
	if (!config) return false;
	const provided = request.headers.get(TELEGRAM_SECRET_HEADER) ?? '';
	return secretsEqual(provided, telegramWebhookSecret(config.token));
}

export function isAllowedTelegramChat(chatId: unknown, allowedChatId: string): boolean {
	return String(chatId) === allowedChatId;
}
