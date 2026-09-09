import { describe, expect, it, vi } from 'vitest';
import { adminReview, notify } from '@/i18n';
import { handleTelegramWebhook } from './telegram-webhook';
import { telegramWebhookSecret } from './telegram-webhook-auth';

const CONFIG = { token: 'test-token', chatId: '12345' };
const POST_ID = '11111111-2222-3333-4444-555555555555';

function callbackBody(overrides: Record<string, unknown> = {}) {
	return {
		callback_query: {
			id: 'cb-1',
			data: `a:${POST_ID}`,
			message: {
				message_id: 7,
				chat: { id: 12345 },
				text: 'Wpis do akceptacji',
			},
			...overrides,
		},
	};
}

function req(body: unknown, secret = telegramWebhookSecret(CONFIG.token)): Request {
	return new Request('https://panel.test/api/telegram/webhook', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Telegram-Bot-Api-Secret-Token': secret,
		},
		body: JSON.stringify(body),
	});
}

describe('handleTelegramWebhook', () => {
	it('odrzuca zły sekret', async () => {
		const res = await handleTelegramWebhook(req(callbackBody(), 'zly'), { config: CONFIG });
		expect(res.status).toBe(401);
	});

	it('ignoruje zwykłą wiadomość (nie callback)', async () => {
		const approve = vi.fn();
		const res = await handleTelegramWebhook(req({ message: { text: 'cześć' } }), {
			config: CONFIG,
			approve,
			serviceConfigured: true,
		});
		expect(res.status).toBe(200);
		expect(approve).not.toHaveBeenCalled();
		await expect(res.json()).resolves.toEqual({ ok: true, ignored: true });
	});

	it('nie akceptuje z obcego czatu', async () => {
		const approve = vi.fn();
		const answer = vi.fn();
		const body = callbackBody();
		(body.callback_query.message as { chat: { id: number } }).chat.id = 999;
		await handleTelegramWebhook(req(body), {
			config: CONFIG,
			approve,
			answer,
			serviceConfigured: true,
		});
		expect(approve).not.toHaveBeenCalled();
		expect(answer).toHaveBeenCalledWith('cb-1', notify.review.forbidden, true, { config: CONFIG });
	});

	it('akceptuje pending i zdejmuje przycisk Akceptuj', async () => {
		const approve = vi.fn().mockResolvedValue({ ok: true, scheduled: false });
		const answer = vi.fn();
		const edit = vi.fn();
		const res = await handleTelegramWebhook(req(callbackBody()), {
			config: CONFIG,
			approve,
			answer,
			edit,
			serviceConfigured: true,
		});
		expect(approve).toHaveBeenCalledWith(POST_ID);
		expect(answer).toHaveBeenCalledWith('cb-1', adminReview.approved, false, { config: CONFIG });
		expect(edit).toHaveBeenCalledOnce();
		const edited = edit.mock.calls[0]![0] as { text: string; replyMarkup: { inline_keyboard: unknown[] } };
		expect(edited.text).toContain(adminReview.approved);
		expect(JSON.stringify(edited.replyMarkup)).not.toContain('callback_data');
		await expect(res.json()).resolves.toEqual({ ok: true, handled: true });
	});

	it('przy wpisie już ruszonym zostawia tylko link do panelu', async () => {
		const approve = vi.fn().mockResolvedValue({ ok: false, error: 'not_pending' });
		const answer = vi.fn();
		const edit = vi.fn();
		await handleTelegramWebhook(req(callbackBody()), {
			config: CONFIG,
			approve,
			answer,
			edit,
			serviceConfigured: true,
		});
		expect(answer).toHaveBeenCalledWith('cb-1', notify.review.alreadyHandled, true, {
			config: CONFIG,
		});
		expect(edit).toHaveBeenCalledOnce();
	});
});
