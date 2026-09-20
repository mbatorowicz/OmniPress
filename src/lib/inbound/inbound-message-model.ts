export const INBOUND_STATUSES = ['drafted', 'replaced', 'awaiting_clarification'] as const;

export type InboundMessageStatus = (typeof INBOUND_STATUSES)[number];

export type InboundMessageRow = {
	message_id: string;
	from_email: string;
	post_id: string | null;
	page_id: string | null;
	status: InboundMessageStatus;
	source_message_id: string | null;
};

export type RecordInboundInput = {
	messageId: string;
	fromEmail: string;
	status: InboundMessageStatus;
	postId?: string | null;
	pageId?: string | null;
	sourceMessageId?: string | null;
};

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

export function mapInboundMessageRow(raw: unknown): InboundMessageRow | null {
	if (!raw || typeof raw !== 'object') return null;
	const rec = raw as Record<string, unknown>;
	const messageId = asId(rec.message_id);
	const fromEmail = typeof rec.from_email === 'string' ? rec.from_email : '';
	if (!messageId || !fromEmail) return null;
	const status = INBOUND_STATUSES.includes(rec.status as InboundMessageStatus)
		? (rec.status as InboundMessageStatus)
		: 'drafted';
	return {
		message_id: messageId,
		from_email: fromEmail,
		post_id: asId(rec.post_id),
		page_id: asId(rec.page_id),
		status,
		source_message_id: asId(rec.source_message_id),
	};
}

export function inboundRecordPayload(input: RecordInboundInput): Record<string, unknown> {
	return {
		message_id: input.messageId.trim(),
		from_email: input.fromEmail,
		status: input.status,
		post_id: input.postId ?? null,
		page_id: input.pageId ?? null,
		source_message_id: input.sourceMessageId ?? null,
	};
}
