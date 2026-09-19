import { inboundAi } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import { completeInboundObject, type InboundAiComplete } from './ai-client';
import { coalesceDrafts } from './coalesce-drafts';
import type { InboundFileInventory } from './collect-attachment-texts';
import { applyEnrichment, enrichFallback, type EnrichDraft } from './enrich-model';
import { buildInboundEnrichPrompt } from './enrich-prompt';
import { enrichRetrySystem } from './enrich-retry';
import { inboundAiEnvFromMeta, inboundAiModel, INBOUND_AI_TIMEOUT_MS } from './inbound-ai-config';
import { logInboundAiFailed, logInboundAiOk } from './inbound-ai-log';
import { countMessageClusters } from './message-clusters';

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

const RETRY_BUDGET_MS = 8_000;

function applyRaw(
	raw: unknown,
	input: EnrichInboundInput,
	fallback: EnrichDraft,
): EnrichDraft[] {
	return applyEnrichment(
		raw,
		input.categories,
		fallback,
		input.attachments.map((row) => row.filename),
		new Map(input.attachments.map((row) => [row.filename, row.text])),
	);
}

export async function enrichInboundDraft(
	input: EnrichInboundInput,
	opts: EnrichInboundOptions = {},
): Promise<EnrichDraft[]> {
	const fallback = enrichFallback(input.title, input.contentMd);
	const complete = opts.complete ?? completeInboundObject;
	const timeoutMs = opts.timeoutMs ?? INBOUND_AI_TIMEOUT_MS;
	const model = inboundAiModel(inboundAiEnvFromMeta());
	const clusters = countMessageClusters(input.attachments);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const started = Date.now();
	const prompt = buildInboundEnrichPrompt(input);
	try {
		let raw = await complete({
			system: inboundAi.system,
			prompt,
			signal: controller.signal,
		});
		let drafts = applyRaw(raw, input, fallback);
		const retrySystem = enrichRetrySystem(clusters, drafts.length);
		const remaining = timeoutMs - (Date.now() - started);
		if (retrySystem && remaining >= RETRY_BUDGET_MS && !controller.signal.aborted) {
			raw = await complete({
				system: retrySystem,
				prompt,
				signal: controller.signal,
			});
			drafts = applyRaw(raw, input, fallback);
		}
		drafts = coalesceDrafts(drafts, input.attachments);
		logInboundAiOk(model, drafts.length, clusters);
		return drafts;
	} catch (error) {
		logInboundAiFailed(error, model);
		return [fallback];
	} finally {
		clearTimeout(timer);
	}
}
