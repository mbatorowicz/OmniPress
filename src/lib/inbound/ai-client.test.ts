import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_INBOUND_AI_MODEL,
	DEFAULT_INBOUND_AI_REASONING,
} from './inbound-ai-config';

const generateObject = vi.hoisted(() =>
	vi.fn(async () => ({ object: { intent: 'create', posts: [] } })),
);

vi.mock('ai', () => ({ generateObject }));

describe('completeInboundObject', () => {
	beforeEach(() => {
		generateObject.mockClear();
	});

	it('woła Grok 4.6 z myśleniem high', async () => {
		const { completeInboundObject } = await import('./ai-client');
		await completeInboundObject({
			system: 'sys',
			prompt: 'treść',
			files: [],
			signal: new AbortController().signal,
		});
		expect(generateObject).toHaveBeenCalledTimes(1);
		const call = generateObject.mock.calls[0]?.[0] as {
			model: string;
			reasoning: string;
		};
		expect(call.model).toBe(DEFAULT_INBOUND_AI_MODEL);
		expect(call.reasoning).toBe(DEFAULT_INBOUND_AI_REASONING);
		expect(call.model).toBe('spacexai/grok-4.6');
		expect(call.reasoning).toBe('high');
	});
});
