import { generateObject } from 'ai';
import { inboundAi } from '@/i18n';
import {
	DEFAULT_INBOUND_AI_REASONING,
	inboundAiEnvFromMeta,
	inboundAiModel,
} from './inbound-ai-config';
import { inboundEnrichSchema } from './enrich-schema';
import type { InboundAiFilePart } from './vision-model';

export type InboundAiComplete = (input: {
	system: string;
	prompt: string;
	files: InboundAiFilePart[];
	signal: AbortSignal;
}) => Promise<unknown>;

function labeledImageParts(files: InboundAiFilePart[]) {
	return files.flatMap((file) => [
		{ type: 'text' as const, text: `${inboundAi.visionPartLabel}: ${file.filename}` },
		{ type: 'file' as const, data: file.data, mediaType: file.mediaType },
	]);
}

function userContent(prompt: string, files: InboundAiFilePart[]) {
	return [{ type: 'text' as const, text: prompt }, ...labeledImageParts(files)];
}

export async function completeInboundObject(input: {
	system: string;
	prompt: string;
	files: InboundAiFilePart[];
	signal: AbortSignal;
}): Promise<unknown> {
	const { object } = await generateObject({
		model: inboundAiModel(inboundAiEnvFromMeta()),
		reasoning: DEFAULT_INBOUND_AI_REASONING,
		schema: inboundEnrichSchema,
		system: input.system,
		messages: [{ role: 'user', content: userContent(input.prompt, input.files) }],
		abortSignal: input.signal,
		maxRetries: 0,
	});
	return object;
}
