import { inbound } from '@/i18n';
import { INBOUND_FROM_ADDRESS } from './mailbox';

export const RESEND_SEND_URL = 'https://api.resend.com/emails';

export type SendInboundMailInput = {
	to: string;
	subject: string;
	text: string;
	messageId?: string;
	inReplyTo?: string;
};

export function inboundMailFromHeader(): string {
	return `${inbound.mail.fromName} <${INBOUND_FROM_ADDRESS}>`;
}

export function inboundMailPayload(input: SendInboundMailInput): Record<string, unknown> {
	const headers: Record<string, string> = {};
	if (input.messageId) headers['Message-ID'] = input.messageId;
	if (input.inReplyTo) {
		headers['In-Reply-To'] = input.inReplyTo;
		headers.References = input.inReplyTo;
	}
	return {
		from: inboundMailFromHeader(),
		to: [input.to],
		subject: input.subject,
		text: input.text,
		...(Object.keys(headers).length > 0 ? { headers } : {}),
	};
}
