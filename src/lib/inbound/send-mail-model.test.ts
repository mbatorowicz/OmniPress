import { describe, expect, it } from 'vitest';
import { inboundMailFromHeader, inboundMailPayload } from './send-mail-model';
import { inboundClarifyMessageId } from './mailbox';

describe('send-mail-model', () => {
	it('From ze skrzynki i Message-ID wątku', () => {
		expect(inboundMailFromHeader()).toContain('wpisy@inbound.cncsolutions.dev');
		const payload = inboundMailPayload({
			to: 'jan@cncsolutions.dev',
			subject: 'Re: Plakaty',
			text: 'Pytanie',
			messageId: inboundClarifyMessageId('abc'),
		});
		expect(payload.to).toEqual(['jan@cncsolutions.dev']);
		expect((payload.headers as Record<string, string>)['Message-ID']).toBe(
			inboundClarifyMessageId('abc'),
		);
	});
});
