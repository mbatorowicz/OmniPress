export const INBOUND_FROM_ADDRESS = 'wpisy@inbound.cncsolutions.dev';
export const INBOUND_MESSAGE_ID_DOMAIN = 'inbound.cncsolutions.dev';

export function inboundClarifyMessageId(emailId: string): string {
	return `<inbound.${emailId.trim()}@${INBOUND_MESSAGE_ID_DOMAIN}>`;
}

const MESSAGE_ID_RE = /inbound\.([^@>\s]+)@inbound\.cncsolutions\.dev/i;

/** Wyciąga Resend email_id z In-Reply-To / References. */
export function parseInboundThreadEmailId(...headers: Array<string | null | undefined>): string | null {
	for (const header of headers) {
		const match = header?.match(MESSAGE_ID_RE);
		const id = match?.[1]?.trim();
		if (id && !/[/?#]/.test(id)) return id;
	}
	return null;
}
