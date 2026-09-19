import { common } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { EnrichInboundInput } from './enrich';
import { enrichFallback, isSameEnrichDraft, type EnrichDraft } from './enrich-model';
import { parseInboundBody } from './parse-body';
import { parseInboundSubject } from './parse-subject';

export type PreparedInboundDraft = {
	drafts: EnrichDraft[];
	aiFallback: boolean;
	inventory: InboundFileInventory[];
};

export type PrepareInboundDraftInput = {
	subject: string;
	text: string | null;
	html: string | null;
	siteSlug: string;
	emailId: string;
	shouldEnrich: boolean;
	collectInventory: (emailId: string) => Promise<InboundFileInventory[]>;
	loadCategories: (siteSlug: string) => Promise<CategoryOption[]>;
	enrich: (input: EnrichInboundInput) => Promise<EnrichDraft[]>;
};

/** Temat + treść; opcjonalnie Grok (załączniki + kategorie). */
export async function prepareInboundDraft(
	input: PrepareInboundDraftInput,
): Promise<PreparedInboundDraft> {
	const title = parseInboundSubject(input.subject) || common.untitled;
	const contentMd = parseInboundBody({ text: input.text, html: input.html });
	const fallback = enrichFallback(title, contentMd);
	if (!input.shouldEnrich) return { drafts: [fallback], aiFallback: false, inventory: [] };

	let attachments: InboundFileInventory[] = [];
	let categories: CategoryOption[] = [];
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
		const drafts = await input.enrich({ title, contentMd, attachments, categories });
		const only = drafts[0] ?? fallback;
		const aiFallback = drafts.length === 1 && isSameEnrichDraft(only, fallback);
		return {
			drafts: drafts.length > 0 ? drafts : [fallback],
			aiFallback,
			inventory: attachments,
		};
	} catch {
		return { drafts: [fallback], aiFallback: true, inventory: attachments };
	}
}
