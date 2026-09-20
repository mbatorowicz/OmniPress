import { describe, expect, it } from 'vitest';
import { inbound } from '@/i18n';
import { inboundClarifyBody, inboundClarifyMail, inboundClarifySubject } from './clarify-mail';
import { inboundClarifyMessageId } from './mailbox';

describe('clarify-mail', () => {
	it('składa Re: i pytanie bez treści urzędowej w temacie ogólnika', () => {
		expect(inboundClarifySubject('Re: Plakaty')).toBe('Re: Plakaty');
		const body = inboundClarifyBody('Który plakat opublikować?', [
			{
				kind: 'post',
				id: '11111111-1111-4111-8111-111111111111',
				siteId: 'site',
				title: 'Festyn',
			},
		]);
		expect(body).toContain(inbound.mail.clarifyIntro);
		expect(body).toContain('Który plakat opublikować?');
		expect(body).toContain(inbound.mail.candidatesHeading);
		expect(body).toContain('Festyn');
		const mail = inboundClarifyMail({
			emailId: 'abc',
			to: 'jan@cncsolutions.dev',
			subject: 'Plakaty',
			question: 'Nieczytelny skan.',
		});
		expect(mail.messageId).toBe(inboundClarifyMessageId('abc'));
		expect(mail.to).toBe('jan@cncsolutions.dev');
	});
});
