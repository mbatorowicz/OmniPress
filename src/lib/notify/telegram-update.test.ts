import { describe, expect, it } from 'vitest';
import { parseTelegramCallbackQuery } from './telegram-update';

const POST_ID = '11111111-2222-3333-4444-555555555555';

describe('parseTelegramCallbackQuery', () => {
	it('czyta id, data, czat i treść wiadomości', () => {
		expect(
			parseTelegramCallbackQuery({
				callback_query: {
					id: 'cb-1',
					data: `a:${POST_ID}`,
					message: {
						message_id: 44,
						chat: { id: 12345 },
						text: 'Wpis do akceptacji',
					},
				},
			}),
		).toEqual({
			id: 'cb-1',
			data: `a:${POST_ID}`,
			chatId: '12345',
			messageId: 44,
			text: 'Wpis do akceptacji',
		});
	});

	it('odrzuca update bez callback_query albo bez wiadomości', () => {
		expect(parseTelegramCallbackQuery({ message: { text: 'cześć' } })).toBeNull();
		expect(parseTelegramCallbackQuery({ callback_query: { id: 'x' } })).toBeNull();
		expect(parseTelegramCallbackQuery(null)).toBeNull();
	});
});
