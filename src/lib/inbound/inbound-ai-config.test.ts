import { describe, expect, it } from 'vitest';
import {
	DEFAULT_INBOUND_AI_MODEL,
	DEFAULT_INBOUND_AI_REASONING,
	inboundAiConfigured,
	inboundAiModel,
} from './inbound-ai-config';

describe('inboundAiModel', () => {
	it('domyślnie Grok 4.6 z myśleniem; pusty string wyłącza', () => {
		expect(DEFAULT_INBOUND_AI_MODEL).toBe('spacexai/grok-4.6');
		expect(DEFAULT_INBOUND_AI_REASONING).toBe('high');
		expect(inboundAiModel({})).toBe(DEFAULT_INBOUND_AI_MODEL);
		expect(inboundAiModel({ INBOUND_AI_MODEL: ' xai/grok-3 ' })).toBe('xai/grok-3');
		expect(inboundAiModel({ INBOUND_AI_MODEL: '' })).toBe('');
		expect(inboundAiModel({ INBOUND_AI_MODEL: '   ' })).toBe('');
	});
});

describe('inboundAiConfigured', () => {
	it('wymaga modelu oraz klucza albo Vercel OIDC', () => {
		expect(inboundAiConfigured({})).toBe(false);
		expect(inboundAiConfigured({ AI_GATEWAY_API_KEY: 'gw_x' })).toBe(true);
		expect(inboundAiConfigured({ VERCEL: '1' })).toBe(true);
		expect(inboundAiConfigured({ INBOUND_AI_MODEL: '', AI_GATEWAY_API_KEY: 'gw_x' })).toBe(
			false,
		);
	});
});
