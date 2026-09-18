export const EMAIL_RECEIVED = 'email.received';

export type InboundReceivedEvent = {
	emailId: string;
	from: string;
	subject: string;
};

function asTrimmed(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Metadane `email.received` (bez ciała). Inny typ albo brak `email_id` → null. */
export function parseEmailReceivedEvent(payload: unknown): InboundReceivedEvent | null {
	if (!payload || typeof payload !== 'object') return null;
	const rec = payload as Record<string, unknown>;
	if (rec.type !== EMAIL_RECEIVED) return null;
	const data = rec.data;
	if (!data || typeof data !== 'object') return null;
	const fields = data as Record<string, unknown>;
	const emailId = asTrimmed(fields.email_id);
	if (!emailId || /[/?#]/.test(emailId)) return null;
	return {
		emailId,
		from: asTrimmed(fields.from),
		subject: asTrimmed(fields.subject),
	};
}
