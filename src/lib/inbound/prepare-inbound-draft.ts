import { common, inbound } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { EnrichInboundInput } from './enrich';
import { enrichFallback, type EnrichDraft } from './enrich-model';
import type { EnrichOutcome, EnrichReplace } from './enrich-outcome';
import { parseInboundBody } from './parse-body';
import { parseInboundSubject } from './parse-subject';

export type PreparedInboundCreate = {
	kind: 'create';
	drafts: EnrichDraft[];
	inventory: InboundFileInventory[];
};

export type PreparedInboundReplace = EnrichReplace & {
	kind: 'replace';
	inventory: InboundFileInventory[];
};

export type PreparedInboundClarify = {
	kind: 'clarify';
	question: string;
	inventory: InboundFileInventory[];
};

export type PreparedInboundDraft =
	| PreparedInboundCreate
	| PreparedInboundReplace
	| PreparedInboundClarify;

export type PrepareInboundDraftInput = {
	subject: string;
	text: string | null;
	html: string | null;
	siteSlug: string;
	emailId: string;
	shouldEnrich: boolean;
	collectInventory: (emailId: string) => Promise<InboundFileInventory[]>;
	loadCategories: (siteSlug: string) => Promise<CategoryOption[]>;
	loadSiteName?: (siteSlug: string) => Promise<string>;
	enrich: (input: EnrichInboundInput) => Promise<EnrichOutcome>;
};

function clarify(question: string, inventory: InboundFileInventory[]): PreparedInboundClarify {
	return { kind: 'clarify', question, inventory };
}

function fromOutcome(
	outcome: EnrichOutcome,
	inventory: InboundFileInventory[],
): PreparedInboundDraft {
	if (outcome.kind === 'create') return { kind: 'create', drafts: outcome.drafts, inventory };
	if (outcome.kind === 'replace') return { kind: 'replace', ...outcome.replace, inventory };
	if (outcome.kind === 'clarify') return clarify(outcome.question, inventory);
	return clarify(inbound.failedQuestion, inventory);
}

/** Temat + treść; Grok albo 1:1 gdy AI wyłączone. Timeout Groka → pytanie, nie surowy szkic. */
export async function prepareInboundDraft(
	input: PrepareInboundDraftInput,
): Promise<PreparedInboundDraft> {
	const title = parseInboundSubject(input.subject) || common.untitled;
	const contentMd = parseInboundBody({ text: input.text, html: input.html });
	const fallback = enrichFallback(title, contentMd);
	if (!input.shouldEnrich) {
		return { kind: 'create', drafts: [fallback], inventory: [] };
	}

	let attachments: InboundFileInventory[] = [];
	let categories: CategoryOption[] = [];
	let siteName = '';
	try {
		attachments = await input.collectInventory(input.emailId);
	} catch {
		attachments = [];
	}
	try {
		categories = await input.loadCategories(input.siteSlug);
	} catch {
		categories = [];
	}
	try {
		siteName = (await input.loadSiteName?.(input.siteSlug))?.trim() ?? '';
	} catch {
		siteName = '';
	}
	try {
		const outcome = await input.enrich({
			title,
			contentMd,
			attachments,
			categories,
			...(siteName ? { siteName } : {}),
		});
		return fromOutcome(outcome, attachments);
	} catch {
		return clarify(inbound.failedQuestion, attachments);
	}
}
