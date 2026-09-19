import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePostCategoryFields } from '@/lib/posts/category';
import { extractFromEmail } from './allowlist';

const UNIQUE_VIOLATION = '23505';
const AUTHOR_RPC = 'inbound_author_id';

export type CreateInboundDraftInput = {
	messageId: string;
	from: string;
	title: string;
	contentMd: string;
	siteSlug: string;
	fallbackAuthorId: string;
	categorySlug?: string | null;
	extraCategorySlugs?: string[];
};

export type CreateInboundDraftError =
	| 'invalid_message'
	| 'invalid_from'
	| 'no_site'
	| 'no_author'
	| 'insert_failed';

export type CreateInboundDraftResult =
	| { ok: true; postId: string; created: boolean }
	| { ok: false; error: CreateInboundDraftError };

function errorCode(error: unknown): string {
	if (!error || typeof error !== 'object' || !('code' in error)) return '';
	const code = (error as { code?: unknown }).code;
	return typeof code === 'string' ? code : '';
}

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

async function findInboundPostId(
	supabase: SupabaseClient,
	messageId: string,
): Promise<string | null> {
	const { data } = await supabase
		.from('inbound_messages')
		.select('post_id')
		.eq('message_id', messageId)
		.maybeSingle();
	return asId((data as { post_id?: unknown } | null)?.post_id);
}

async function findSiteId(supabase: SupabaseClient, slug: string): Promise<string | null> {
	const { data } = await supabase
		.from('sites')
		.select('id')
		.eq('slug', slug)
		.eq('is_active', true)
		.maybeSingle();
	return asId((data as { id?: unknown } | null)?.id);
}

async function findAuthorId(supabase: SupabaseClient, email: string): Promise<string | null> {
	const { data, error } = await supabase.rpc(AUTHOR_RPC, { p_email: email });
	if (error) return null;
	return asId(data);
}

export async function createInboundDraft(
	supabase: SupabaseClient,
	input: CreateInboundDraftInput,
): Promise<CreateInboundDraftResult> {
	const messageId = input.messageId.trim();
	if (!messageId) return { ok: false, error: 'invalid_message' };
	const fromEmail = extractFromEmail(input.from);
	if (!fromEmail) return { ok: false, error: 'invalid_from' };

	const existing = await findInboundPostId(supabase, messageId);
	if (existing) return { ok: true, postId: existing, created: false };

	const siteId = await findSiteId(supabase, input.siteSlug.trim());
	if (!siteId) return { ok: false, error: 'no_site' };

	const authorId = (await findAuthorId(supabase, fromEmail)) || input.fallbackAuthorId.trim();
	if (!authorId) return { ok: false, error: 'no_author' };

	const category = input.categorySlug?.trim()
		? await resolvePostCategoryFields(
				supabase,
				siteId,
				input.categorySlug,
				input.extraCategorySlugs ?? [],
			)
		: null;

	const { data: post, error: postError } = await supabase
		.from('posts')
		.insert({
			author_id: authorId,
			site_id: siteId,
			title: input.title,
			content_md: input.contentMd,
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
	const postId = asId((post as { id?: unknown } | null)?.id);
	if (postError || !postId) return { ok: false, error: 'insert_failed' };

	const { error: inboundError } = await supabase.from('inbound_messages').insert({
		message_id: messageId,
		from_email: fromEmail,
		post_id: postId,
	});
	if (!inboundError) return { ok: true, postId, created: true };

	await supabase.from('posts').delete().eq('id', postId);
	if (errorCode(inboundError) === UNIQUE_VIOLATION) {
		const retryId = await findInboundPostId(supabase, messageId);
		if (retryId) return { ok: true, postId: retryId, created: false };
	}
	return { ok: false, error: 'insert_failed' };
}
