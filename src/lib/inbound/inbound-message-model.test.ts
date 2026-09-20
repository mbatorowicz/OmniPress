import { describe, expect, it } from 'vitest';
import { inboundRecordPayload, mapInboundMessageRow } from './inbound-message-model';

describe('inbound-message-model', () => {
	it('mapuje wiersz i składa insert', () => {
		expect(
			mapInboundMessageRow({
				message_id: 'e1',
				from_email: 'jan@x.pl',
				post_id: null,
				status: 'awaiting_clarification',
			}),
		).toMatchObject({
			message_id: 'e1',
			status: 'awaiting_clarification',
			post_id: null,
		});
		expect(
			inboundRecordPayload({
				messageId: ' e1 ',
				fromEmail: 'jan@x.pl',
				status: 'drafted',
				postId: 'p1',
			}),
		).toEqual({
			message_id: 'e1',
			from_email: 'jan@x.pl',
			status: 'drafted',
			post_id: 'p1',
			page_id: null,
			source_message_id: null,
		});
	});
});
