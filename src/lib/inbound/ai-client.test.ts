import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inboundAi } from '@/i18n';
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
		const first = generateObject.mock.calls.at(0)?.at(0) as unknown as {
			model: string;
			reasoning: string;
		};
		expect(first.model).toBe(DEFAULT_INBOUND_AI_MODEL);
		expect(first.reasoning).toBe(DEFAULT_INBOUND_AI_REASONING);
		expect(first.model).toBe('spacexai/grok-4.6');
		expect(first.reasoning).toBe('high');
	});

	it('wysyła JPEG jako file/image z etykietą, bez native PDF', async () => {
		const { completeInboundObject } = await import('./ai-client');
		const jpeg = new Uint8Array([0xff, 0xd8, 0xff]);
		await completeInboundObject({
			system: 'sys',
			prompt: 'treść',
			files: [{ filename: 'Plakat-p1.jpg', mediaType: 'image/jpeg', data: jpeg }],
			signal: new AbortController().signal,
		});
		const call = generateObject.mock.calls.at(0)?.at(0) as unknown as {
			messages: {
				content: { type: string; text?: string; data?: Uint8Array; mediaType?: string; image?: unknown }[];
			}[];
		};
		const content = call.messages[0]?.content ?? [];
		expect(content.some((part) => part.type === 'image')).toBe(false);
		expect(content).toEqual([
			{ type: 'text', text: 'treść' },
			{ type: 'text', text: `${inboundAi.visionPartLabel}: Plakat-p1.jpg` },
			{ type: 'file', data: jpeg, mediaType: 'image/jpeg' },
		]);
	});
});
