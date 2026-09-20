import { inboundAi } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import { applyCoverLetterDrops } from './attachment-display';
import { completeInboundObject, type InboundAiComplete } from './ai-client';
import { coalesceDrafts, omitCoverLetterDrafts } from './coalesce-drafts';
import { draftsFromClusters, appendUnassignedClusterDrafts, splitLumpedDrafts } from './split-lumped-drafts';
import type { InboundFileInventory } from './collect-attachment-texts';
import { enrichFallback } from './enrich-model';
import { resolveEnrichOutcome, type EnrichOutcome } from './enrich-outcome';
import { buildInboundEnrichPrompt } from './enrich-prompt';
import { inboundAiEnvFromMeta, inboundAiModel, INBOUND_AI_TIMEOUT_MS } from './inbound-ai-config';
import { logInboundAiFailed, logInboundAiOk } from './inbound-ai-log';
import { buildInboundVisionParts } from './vision-parts';

export type EnrichInboundInput = {
	title: string;
	contentMd: string;
	attachments: InboundFileInventory[];
	categories: CategoryOption[];
	siteName?: string;
};

export type EnrichInboundOptions = {
	complete?: InboundAiComplete;
	timeoutMs?: number;
};

function fileTexts(attachments: InboundFileInventory[]): Map<string, string> {
	return new Map(attachments.map((row) => [row.filename, row.text]));
}

function defaultCategorySlug(categories: CategoryOption[]): string | null {
	if (categories.some((row) => row.slug === 'aktualnosci')) return 'aktualnosci';
	return categories[0]?.slug ?? null;
}

function withCreateSafety(
	outcome: EnrichOutcome,
	attachments: InboundFileInventory[],
	categorySlug: string | null,
): EnrichOutcome {
	if (outcome.kind !== 'create') return outcome;
	const drafts = omitCoverLetterDrafts(
		appendUnassignedClusterDrafts(
			coalesceDrafts(
				splitLumpedDrafts(omitCoverLetterDrafts(outcome.drafts, attachments), attachments),
				attachments,
			),
			attachments,
			categorySlug,
		),
		attachments,
	);
	return drafts.length > 0 ? { kind: 'create', drafts } : { kind: 'failed' };
}

function outcomeFromRaw(
	raw: unknown,
	input: EnrichInboundInput,
	attachments: InboundFileInventory[],
	fallback: { title: string; contentMd: string },
): EnrichOutcome {
	const resolved = resolveEnrichOutcome(
		raw,
		input.categories,
		fallback,
		attachments.map((row) => row.filename),
		fileTexts(attachments),
	);
	const categorySlug = defaultCategorySlug(input.categories);
	if (resolved.kind === 'clarify') {
		const fromClusters = draftsFromClusters(attachments, categorySlug);
		if (fromClusters.length >= 2) return withCreateSafety({ kind: 'create', drafts: fromClusters }, attachments, categorySlug);
	}
	return withCreateSafety(resolved, attachments, categorySlug);
}

export async function enrichInboundDraft(
	input: EnrichInboundInput,
	opts: EnrichInboundOptions = {},
): Promise<EnrichOutcome> {
	const attachments = applyCoverLetterDrops(input.attachments);
	const fallback = enrichFallback(input.title, input.contentMd);
	const complete = opts.complete ?? completeInboundObject;
	const timeoutMs = opts.timeoutMs ?? INBOUND_AI_TIMEOUT_MS;
	const model = inboundAiModel(inboundAiEnvFromMeta());
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const prompt = buildInboundEnrichPrompt({ ...input, attachments });
	try {
		const files = await buildInboundVisionParts(attachments);
		timer = setTimeout(() => controller.abort(), timeoutMs);
		const started = Date.now();
		const raw = await complete({
			system: inboundAi.system,
			prompt,
			files,
			signal: controller.signal,
		});
		const outcome = outcomeFromRaw(raw, input, attachments, fallback);
		logInboundAiOk(
			model,
			outcome.kind,
			outcome.kind === 'create' ? outcome.drafts.length : 0,
			Date.now() - started,
		);
		return outcome;
	} catch (error) {
		logInboundAiFailed(error, model);
		return { kind: 'failed' };
	} finally {
		if (timer) clearTimeout(timer);
	}
}
