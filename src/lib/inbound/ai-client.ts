import { generateObject } from 'ai';
import { inboundAiEnvFromMeta, inboundAiModel } from './inbound-ai-config';
import { inboundEnrichSchema } from './enrich-schema';

export type InboundAiComplete = (input: {
	system: string;
	prompt: string;
	signal: AbortSignal;
}) => Promise<unknown>;

export async function completeInboundObject(input: {
	system: string;
	prompt: string;
	signal: AbortSignal;
}): Promise<unknown> {
	const { object } = await generateObject({
		model: inboundAiModel(inboundAiEnvFromMeta()),
		schema: inboundEnrichSchema,
		system: input.system,
		prompt: input.prompt,
		abortSignal: input.signal,
		maxRetries: 0,
	});
	return object;
}
