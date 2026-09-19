import { inboundAi } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import { completeInboundObject, type InboundAiComplete } from './ai-client';
import type { InboundFileInventory } from './collect-attachment-texts';
import { applyEnrichment, enrichFallback, type EnrichDraft } from './enrich-model';
import { buildInboundEnrichPrompt } from './enrich-prompt';
import { inboundAiEnvFromMeta, inboundAiModel, INBOUND_AI_TIMEOUT_MS } from './inbound-ai-config';
import { logInboundAiFailed } from './inbound-ai-log';

export type EnrichInboundInput = {
	title: string;
	contentMd: string;
	attachments: InboundFileInventory[];
	categories: CategoryOption[];
};

export type EnrichInboundOptions = {
	complete?: InboundAiComplete;
	timeoutMs?: number;
};

export async function enrichInboundDraft(
	input: EnrichInboundInput,
	opts: EnrichInboundOptions = {},
): Promise<EnrichDraft[]> {
	const fallback = enrichFallback(input.title, input.contentMd);
	const complete = opts.complete ?? completeInboundObject;
	const timeoutMs = opts.timeoutMs ?? INBOUND_AI_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const raw = await complete({
			system: inboundAi.system,
			prompt: buildInboundEnrichPrompt(input),
			signal: controller.signal,
		});
		return applyEnrichment(
			raw,
			input.categories,
			fallback,
			input.attachments.map((row) => row.filename),
			new Map(input.attachments.map((row) => [row.filename, row.text])),
		);
	} catch (error) {
		logInboundAiFailed(error, inboundAiModel(inboundAiEnvFromMeta()));
		return [fallback];
	} finally {
		clearTimeout(timer);
	}
}
