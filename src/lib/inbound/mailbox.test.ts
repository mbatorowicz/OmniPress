import { describe, expect, it } from 'vitest';
import { inboundClarifyMessageId, parseInboundThreadEmailId } from './mailbox';

const EMAIL = '56761188-7520-42d8-8898-ff6fc54ce618';

describe('mailbox thread id', () => {
	it('koduje i odczytuje Message-ID z In-Reply-To / References', () => {
		const id = inboundClarifyMessageId(EMAIL);
		expect(id).toBe(`<inbound.${EMAIL}@inbound.cncsolutions.dev>`);
		expect(parseInboundThreadEmailId(id)).toBe(EMAIL);
		expect(
			parseInboundThreadEmailId(null, `<other@x> ${id}`),
		).toBe(EMAIL);
		expect(parseInboundThreadEmailId('Re: Festyn')).toBeNull();
	});
});
