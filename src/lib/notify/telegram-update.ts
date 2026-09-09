export type TelegramCallbackQuery = {
	id: string;
	data: string;
	chatId: string;
	messageId: number;
	text: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function parseTelegramCallbackQuery(update: unknown): TelegramCallbackQuery | null {
	const root = asRecord(update);
	const query = asRecord(root?.callback_query);
	if (!query || typeof query.id !== 'string') return null;

	const data = typeof query.data === 'string' ? query.data : '';
	const message = asRecord(query.message);
	const chat = asRecord(message?.chat);
	if (chat?.id === undefined || chat.id === null) return null;
	if (typeof message?.message_id !== 'number') return null;

	return {
		id: query.id,
		data,
		chatId: String(chat.id),
		messageId: message.message_id,
		text: typeof message.text === 'string' ? message.text : '',
	};
}
