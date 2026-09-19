import { common } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import type { EnrichDraft } from './enrich-model';
import { enrichFallback, isSameEnrichDraft } from './enrich-model';
import type { EnrichInboundInput } from './enrich';
import type { ExtractedAttachmentText } from './extract-attachment-text';
import { parseInboundBody } from './parse-body';
import { parseInboundSubject } from './parse-subject';

export type PreparedInboundDraft = EnrichDraft & {
	/** True gdy Grok był wołany i wynik = surowy mail (timeout / błąd / zły JSON). */
	aiFallback: boolean;
};

export type PrepareInboundDraftInput = {
	subject: string;
	text: string | null;
	html: string | null;
	siteSlug: string;
	emailId: string;
	shouldEnrich: boolean;
	collectTexts: (emailId: string) => Promise<ExtractedAttachmentText[]>;
	loadCategories: (siteSlug: string) => Promise<CategoryOption[]>;
	enrich: (input: EnrichInboundInput) => Promise<EnrichDraft>;
};

/** Temat + treść; opcjonalnie Grok (PDF/DOCX + kategorie). */
export async function prepareInboundDraft(
	input: PrepareInboundDraftInput,
): Promise<PreparedInboundDraft> {
	const title = parseInboundSubject(input.subject) || common.untitled;
	const contentMd = parseInboundBody({ text: input.text, html: input.html });
	const fallback = enrichFallback(title, contentMd);
	if (!input.shouldEnrich) return { ...fallback, aiFallback: false };

	let attachments: ExtractedAttachmentText[] = [];
	let categories: CategoryOption[] = [];
	try {
		attachments = await input.collectTexts(input.emailId);
	} catch {
		attachments = [];
	}
	try {
		categories = await input.loadCategories(input.siteSlug);
	} catch {
		categories = [];
	}
	try {
		const draft = await input.enrich({ title, contentMd, attachments, categories });
		return { ...draft, aiFallback: isSameEnrichDraft(draft, fallback) };
	} catch {
		return { ...fallback, aiFallback: true };
	}
}
