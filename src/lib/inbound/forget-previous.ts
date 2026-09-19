import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';

const SIBLING_BEFORE_MS = 2_000;
const SIBLING_AFTER_MS = 8_000;

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

export function siblingCreatedRange(createdAt: string): { gte: string; lte: string } {
	const t = Date.parse(createdAt);
	const stamp = Number.isFinite(t) ? t : Date.now();
	return {
		gte: new Date(stamp - SIBLING_BEFORE_MS).toISOString(),
		lte: new Date(stamp + SIBLING_AFTER_MS).toISOString(),
	};
}

async function findInboundPostId(supabase: SupabaseClient, emailId: string): Promise<string | null> {
	const { data } = await supabase
		.from('inbound_messages')
		.select('post_id')
		.eq('message_id', emailId)
		.maybeSingle();
	return asId((data as { post_id?: unknown } | null)?.post_id);
}

async function findSiblingDraftIds(supabase: SupabaseClient, postId: string): Promise<string[]> {
	const { data: post } = await supabase
		.from('posts')
		.select('id, author_id, site_id, created_at, status')
		.eq('id', postId)
		.maybeSingle();
	const row = post as
		| { id?: unknown; author_id?: unknown; site_id?: unknown; created_at?: unknown; status?: unknown }
		| null;
	if (!row || row.status !== 'draft') return asId(row?.id) ? [asId(row.id)!] : [];
	const authorId = asId(row.author_id);
	const siteId = asId(row.site_id);
	const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
	if (!authorId || !siteId || !createdAt) return [postId];

	const range = siblingCreatedRange(createdAt);
	const { data: siblings } = await supabase
		.from('posts')
		.select('id')
		.eq('author_id', authorId)
		.eq('site_id', siteId)
		.eq('status', 'draft')
		.gte('created_at', range.gte)
		.lte('created_at', range.lte);
	const ids = (siblings ?? [])
		.map((item) => asId((item as { id?: unknown }).id))
		.filter((id): id is string => Boolean(id));
	return ids.length > 0 ? [...new Set([postId, ...ids])] : [postId];
}

async function deletePosts(supabase: SupabaseClient, postIds: string[]): Promise<void> {
	const { data: assets } = await supabase.from('assets').select('storage_path').in('post_id', postIds);
	const storagePaths = (assets ?? [])
		.map((row) => (row as { storage_path?: unknown }).storage_path)
		.filter((path): path is string => typeof path === 'string' && path.length > 0);
	if (storagePaths.length > 0) {
		await supabase.storage.from('post-assets').remove(storagePaths);
	}
	await supabase.from('posts').delete().in('id', postIds);
}

/** Kasuje poprzednie szkice z tego maila (inbound_messages spada kaskadą). */
export async function forgetPreviousInbound(
	emailId: string,
	supabase: SupabaseClient | null = isServiceSupabaseConfigured() ? createServiceSupabase() : null,
): Promise<void> {
	if (!supabase) return;
	const postId = await findInboundPostId(supabase, emailId);
	if (!postId) return;
	const postIds = await findSiblingDraftIds(supabase, postId);
	await deletePosts(supabase, postIds);
}
