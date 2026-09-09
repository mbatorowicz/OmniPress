import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	TELEGRAM_SECRET_HEADER,
	TELEGRAM_WEBHOOK_HMAC_KEY,
	authorizeTelegramWebhook,
	isAllowedTelegramChat,
	telegramWebhookSecret,
} from './telegram-webhook-auth';

const CONFIG = { token: 'test-token', chatId: '12345' };

function req(secret?: string): Request {
	return new Request('https://panel.test/api/telegram/webhook', {
		method: 'POST',
		headers: secret ? { [TELEGRAM_SECRET_HEADER]: secret } : {},
	});
}

describe('telegramWebhookSecret', () => {
	it('liczy HMAC SHA-256 tokenu bota', () => {
		const expected = createHmac('sha256', TELEGRAM_WEBHOOK_HMAC_KEY)
			.update('test-token')
			.digest('hex');
		expect(telegramWebhookSecret('test-token')).toBe(expected);
		expect(expected).toHaveLength(64);
	});
});

describe('authorizeTelegramWebhook', () => {
	it('odrzuca brak konfiguracji i zły sekret', () => {
		expect(authorizeTelegramWebhook(req(telegramWebhookSecret(CONFIG.token)), null)).toBe(false);
		expect(authorizeTelegramWebhook(req('zly'), CONFIG)).toBe(false);
		expect(authorizeTelegramWebhook(req(), CONFIG)).toBe(false);
	});

	it('przepuszcza zgodny sekret (porównanie stałoczasowe)', () => {
		expect(authorizeTelegramWebhook(req(telegramWebhookSecret(CONFIG.token)), CONFIG)).toBe(true);
	});
});

describe('isAllowedTelegramChat', () => {
	it('porównuje chat_id jako string (grupy bywają ujemne)', () => {
		expect(isAllowedTelegramChat(-1001, '-1001')).toBe(true);
		expect(isAllowedTelegramChat(99, '12345')).toBe(false);
	});
});
