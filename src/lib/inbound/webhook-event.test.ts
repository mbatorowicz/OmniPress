import { describe, expect, it } from 'vitest';
import { parseEmailReceivedEvent } from './webhook-event';

const EMAIL_ID = '56761188-7520-42d8-8898-ff6fc54ce618';

describe('parseEmailReceivedEvent', () => {
	it('wyciąga email_id, From i temat z email.received', () => {
		expect(
			parseEmailReceivedEvent({
				type: 'email.received',
				data: {
					email_id: ` ${EMAIL_ID} `,
					from: 'Jan <jan@urzad.pl>',
					subject: 'Festyn gminny',
				},
			}),
		).toEqual({
			emailId: EMAIL_ID,
			from: 'Jan <jan@urzad.pl>',
			subject: 'Festyn gminny',
		});
	});

	it('odrzuca inny typ, brak data albo email_id z separatorem ścieżki', () => {
		expect(parseEmailReceivedEvent({ type: 'email.sent', data: { email_id: EMAIL_ID } })).toBeNull();
		expect(parseEmailReceivedEvent({ type: 'email.received' })).toBeNull();
		expect(
			parseEmailReceivedEvent({
				type: 'email.received',
				data: { email_id: `${EMAIL_ID}/../x` },
			}),
		).toBeNull();
		expect(parseEmailReceivedEvent(null)).toBeNull();
		expect(parseEmailReceivedEvent('{}')).toBeNull();
	});
});
