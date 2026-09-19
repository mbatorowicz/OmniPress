import { describe, expect, it, vi } from 'vitest';
import { logInboundAiFailed } from './inbound-ai-log';

describe('logInboundAiFailed', () => {
	it('loguje model i kod, bez treści maila', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = Object.assign(new Error('Proszę o publikację załącznika'), {
			name: 'AI_APICallError',
			statusCode: 404,
		});
		logInboundAiFailed(error, 'xai/grok-4');
		expect(warn).toHaveBeenCalledTimes(1);
		const line = String(warn.mock.calls[0]?.[0]);
		expect(line).toContain('inbound_ai_failed');
		expect(line).toContain('xai/grok-4');
		expect(line).toContain('AI_APICallError');
		expect(line).toContain('"status":404');
		expect(line).not.toContain('Proszę o publikację');
		warn.mockRestore();
	});
});
