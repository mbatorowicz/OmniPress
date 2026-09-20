import { describe, expect, it } from 'vitest';
import { headerValue, parseEmailHeaders } from './receiving-headers';

describe('parseEmailHeaders', () => {
	it('czyta tablicę Resend i obiekt', () => {
		expect(
			parseEmailHeaders([
				{ name: 'In-Reply-To', value: '<inbound.abc@inbound.cncsolutions.dev>' },
			])['in-reply-to'],
		).toBe('<inbound.abc@inbound.cncsolutions.dev>');
		expect(headerValue({ references: '<x>' }, 'References')).toBe('<x>');
	});
});
