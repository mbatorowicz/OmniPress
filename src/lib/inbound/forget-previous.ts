import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

async function findInboundPostId(supabase: SupabaseClient, emailId: string): Promise<string | null> {
	const { data } = await supabase
		.from('inbound_messages')
		.select('post_id')
		.eq('message_id', emailId)
		.maybeSingle();
	return asId((data as { post_id?: unknown } | null)?.post_id);
}

/** Kasuje poprzedni szkic z tego maila (inbound_messages spada kaskadą). */
export async function forgetPreviousInbound(emailId: string): Promise<void> {
	if (!isServiceSupabaseConfigured()) return;
	const supabase = createServiceSupabase();
	const postId = await findInboundPostId(supabase, emailId);
	if (!postId) return;

	const { data: assets } = await supabase
		.from('assets')
		.select('storage_path')
		.eq('post_id', postId);
	const storagePaths = (assets ?? [])
		.map((row) => (row as { storage_path?: unknown }).storage_path)
		.filter((path): path is string => typeof path === 'string' && path.length > 0);
	if (storagePaths.length > 0) {
		await supabase.storage.from('post-assets').remove(storagePaths);
	}
	await supabase.from('posts').delete().eq('id', postId);
}
