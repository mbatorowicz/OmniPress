import type { CategoryOption } from '@/lib/categories';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import {
	createInboundDraft,
	type CreateInboundDraftInput,
	type CreateInboundDraftResult,
} from './create-draft';
import type { EnrichDraft } from './enrich-model';
import type { InboundEmailDeps } from './handle-deps';
import { findInboundMessage, recordInboundMessage } from './inbound-message';
import { loadInboundSiteCategories, loadInboundSiteName } from './load-inbound-categories';
import { parseInboundThreadEmailId } from './mailbox';
import type { ReceivedInboundEmail } from './receiving';

export async function defaultCreateDraft(
	input: CreateInboundDraftInput,
): Promise<CreateInboundDraftResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'insert_failed' };
	return createInboundDraft(createServiceSupabase(), input);
}

export async function defaultLoadCategories(siteSlug: string): Promise<CategoryOption[]> {
	if (!isServiceSupabaseConfigured()) return [];
	return loadInboundSiteCategories(createServiceSupabase(), siteSlug);
}

export async function defaultLoadSiteName(siteSlug: string): Promise<string> {
	if (!isServiceSupabaseConfigured()) return '';
	return loadInboundSiteName(createServiceSupabase(), siteSlug);
}

export function defaultFind(messageId: string) {
	if (!isServiceSupabaseConfigured()) return Promise.resolve(null);
	return findInboundMessage(createServiceSupabase(), messageId);
}

export function defaultRecord(input: Parameters<NonNullable<InboundEmailDeps['recordInbound']>>[0]) {
	if (!isServiceSupabaseConfigured()) return Promise.resolve({ ok: false as const });
	return recordInboundMessage(createServiceSupabase(), input);
}

export async function inventoryEmailId(
	eventId: string,
	email: ReceivedInboundEmail,
	findInbound: NonNullable<InboundEmailDeps['findInbound']>,
): Promise<{ emailId: string; sourceMessageId: string | null }> {
	const threadId = parseInboundThreadEmailId(email.inReplyTo, email.references);
	if (!threadId || threadId === eventId) return { emailId: eventId, sourceMessageId: null };
	const original = await findInbound(threadId);
	if (original?.status !== 'awaiting_clarification') {
		return { emailId: eventId, sourceMessageId: null };
	}
	return { emailId: threadId, sourceMessageId: threadId };
}

export function toCreateInput(
	event: { emailId: string; from: string },
	email: ReceivedInboundEmail,
	siteSlug: string,
	fallbackAuthorId: string,
	drafts: EnrichDraft[],
): CreateInboundDraftInput {
	return {
		messageId: event.emailId,
		from: email.from || event.from,
		siteSlug,
		fallbackAuthorId,
		drafts: drafts.map((draft) => ({
			title: draft.title,
			contentMd: draft.contentMd,
			...(draft.categorySlug
				? { categorySlug: draft.categorySlug, extraCategorySlugs: draft.extraCategorySlugs }
				: {}),
		})),
	};
}
