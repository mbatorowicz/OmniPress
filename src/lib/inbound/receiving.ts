export const RESEND_RECEIVING_BASE = 'https://api.resend.com/emails/receiving';
export const RESEND_TIMEOUT_MS = 8000;

export type ReceivedInboundEmail = {
	id: string;
	from: string;
	subject: string;
	text: string | null;
	html: string | null;
};

export type GetReceivedEmailOpts = {
	apiKey: string;
	fetch?: typeof fetch;
	timeoutMs?: number;
};

export function inboundResendApiKey(): string {
	return import.meta.env.RESEND_API_KEY?.trim() ?? '';
}

function asText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function asBody(value: unknown): string | null {
	if (value == null) return null;
	return typeof value === 'string' ? value : null;
}

function receivingUrl(emailId: string): string {
	return `${RESEND_RECEIVING_BASE}/${encodeURIComponent(emailId)}?html_format=cid`;
}

function mapReceivedEmail(emailId: string, raw: unknown): ReceivedInboundEmail | null {
	if (!raw || typeof raw !== 'object') return null;
	const rec = raw as Record<string, unknown>;
	return {
		id: asText(rec.id) || emailId,
		from: asText(rec.from),
		subject: asText(rec.subject),
		text: asBody(rec.text),
		html: asBody(rec.html),
	};
}

/** GET emails.receiving.get — nie loguj html/text (RODO). */
export async function getReceivedEmail(
	emailId: string,
	opts: GetReceivedEmailOpts,
): Promise<ReceivedInboundEmail | null> {
	const apiKey = opts.apiKey.trim();
	const id = emailId.trim();
	if (!apiKey || !id) return null;

	const doFetch = opts.fetch ?? fetch;
	const timeoutMs = opts.timeoutMs ?? RESEND_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await doFetch(receivingUrl(id), {
			method: 'GET',
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: controller.signal,
		});
		if (!response.ok) return null;
		return mapReceivedEmail(id, await response.json());
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
