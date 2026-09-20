import { inboundAi } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import { inboundEnrichSchema } from './enrich-schema';
import { applyEnrichment, type EnrichDraft } from './enrich-model';

export type EnrichReplace = {
	target: 'post' | 'page';
	hint: string;
	filename: string | null;
	display: 'embed' | 'link' | null;
};

export type EnrichOutcome =
	| { kind: 'create'; drafts: EnrichDraft[] }
	| { kind: 'replace'; replace: EnrichReplace }
	| { kind: 'clarify'; question: string }
	| { kind: 'failed' };

function asNormalizedRaw(raw: unknown): unknown {
	if (!raw || typeof raw !== 'object') return raw;
	const rec = raw as Record<string, unknown>;
	if (Array.isArray(rec.posts)) {
		return { ...rec, posts: rec.posts.slice(0, 1) };
	}
	if (rec.intent || rec.replace || rec.clarification) return raw;
	if ('content_md' in rec) return { intent: 'create', posts: [raw] };
	return raw;
}

function clarifyQuestion(raw: string | undefined): string {
	const question = raw?.trim();
	return question || inboundAi.unclearReplace;
}

/** JSON Groka → intent. Zły kształt albo puste posts przy create = failed (bez zgadywania z tematu). */
export function resolveEnrichOutcome(
	raw: unknown,
	categories: CategoryOption[],
	fallback: { title: string; contentMd: string },
	knownFilenames: string[] = [],
	fileTexts: Map<string, string> = new Map(),
): EnrichOutcome {
	const parsed = inboundEnrichSchema.safeParse(asNormalizedRaw(raw));
	if (!parsed.success) return { kind: 'failed' };
	const data = parsed.data;
	if (data.intent === 'clarify' || data.clarification?.needed) {
		return { kind: 'clarify', question: clarifyQuestion(data.clarification?.question) };
	}
	if (data.intent === 'replace') {
		const replace = data.replace;
		const hint = replace?.hint.trim() ?? '';
		if (!replace || !hint) return { kind: 'clarify', question: inboundAi.unclearReplace };
		return {
			kind: 'replace',
			replace: {
				target: replace.target,
				hint,
				filename: replace.filename?.trim() || null,
				display: replace.display ?? null,
			},
		};
	}
	const drafts = applyEnrichment(data, categories, fallback, knownFilenames, fileTexts);
	if (drafts.length === 0) return { kind: 'failed' };
	return { kind: 'create', drafts };
}
