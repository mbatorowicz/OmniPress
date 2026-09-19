import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePostCategoryFields } from '@/lib/posts/category';
import { extractFromEmail } from './allowlist';

const UNIQUE_VIOLATION = '23505';
const AUTHOR_RPC = 'inbound_author_id';

export type InboundDraftFields = {
	title: string;
	contentMd: string;
	categorySlug?: string | null;
	extraCategorySlugs?: string[];
};

export type CreateInboundDraftInput = {
	messageId: string;
	from: string;
	siteSlug: string;
	fallbackAuthorId: string;
	drafts: InboundDraftFields[];
};

export type CreateInboundDraftError =
	| 'invalid_message'
	| 'invalid_from'
	| 'no_site'
	| 'no_author'
	| 'insert_failed';

export type CreateInboundDraftResult =
	| { ok: true; postId: string; postIds: string[]; created: boolean }
	| { ok: false; error: CreateInboundDraftError };

function errorCode(error: unknown): string {
	if (!error || typeof error !== 'object' || !('code' in error)) return '';
	const code = (error as { code?: unknown }).code;
	return typeof code === 'string' ? code : '';
}

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

async function findInboundPostId(supabase: SupabaseClient, messageId: string): Promise<string | null> {
	const { data } = await supabase
		.from('inbound_messages')
		.select('post_id')
		.eq('message_id', messageId)
		.maybeSingle();
	return asId((data as { post_id?: unknown } | null)?.post_id);
}

async function insertDraftPost(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string,
	draft: InboundDraftFields,
): Promise<string | null> {
	const category = draft.categorySlug?.trim()
		? await resolvePostCategoryFields(
				supabase,
				siteId,
				draft.categorySlug,
				draft.extraCategorySlugs ?? [],
			)
		: null;
	const { data: post, error } = await supabase
		.from('posts')
		.insert({
			author_id: authorId,
			site_id: siteId,
			title: draft.title,
			content_md: draft.contentMd,
			status: 'draft',
			...(category
				? {
						category_slug: category.category_slug,
						category_name: category.category_name,
						extra_category_slugs: category.extra_category_slugs,
					}
				: {}),
		})
		.select('id')
		.single();
	if (error) return null;
	return asId((post as { id?: unknown } | null)?.id);
}

export async function createInboundDraft(
	supabase: SupabaseClient,
	input: CreateInboundDraftInput,
): Promise<CreateInboundDraftResult> {
	const messageId = input.messageId.trim();
	if (!messageId) return { ok: false, error: 'invalid_message' };
	const fromEmail = extractFromEmail(input.from);
	if (!fromEmail) return { ok: false, error: 'invalid_from' };
	const drafts = input.drafts.filter((row) => row.title.trim());
	if (drafts.length === 0) return { ok: false, error: 'insert_failed' };

	const existing = await findInboundPostId(supabase, messageId);
	if (existing) return { ok: true, postId: existing, postIds: [existing], created: false };

	const { data: site } = await supabase
		.from('sites')
		.select('id')
		.eq('slug', input.siteSlug.trim())
		.eq('is_active', true)
		.maybeSingle();
	const siteId = asId((site as { id?: unknown } | null)?.id);
	if (!siteId) return { ok: false, error: 'no_site' };

	const { data: author, error: authorError } = await supabase.rpc(AUTHOR_RPC, {
		p_email: fromEmail,
	});
	const authorId = (!authorError && asId(author)) || input.fallbackAuthorId.trim();
	if (!authorId) return { ok: false, error: 'no_author' };

	const postIds: string[] = [];
	for (const draft of drafts) {
		const postId = await insertDraftPost(supabase, siteId, authorId, draft);
		if (!postId) {
			for (const id of postIds) await supabase.from('posts').delete().eq('id', id);
			return { ok: false, error: 'insert_failed' };
		}
		postIds.push(postId);
	}

	const { error: inboundError } = await supabase.from('inbound_messages').insert({
		message_id: messageId,
		from_email: fromEmail,
		post_id: postIds[0],
	});
	if (!inboundError) return { ok: true, postId: postIds[0]!, postIds, created: true };

	for (const id of postIds) await supabase.from('posts').delete().eq('id', id);
	if (errorCode(inboundError) === UNIQUE_VIOLATION) {
		const retryId = await findInboundPostId(supabase, messageId);
		if (retryId) return { ok: true, postId: retryId, postIds: [retryId], created: false };
	}
	return { ok: false, error: 'insert_failed' };
}
