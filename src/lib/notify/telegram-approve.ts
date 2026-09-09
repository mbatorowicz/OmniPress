import type { SupabaseClient } from '@supabase/supabase-js';
import { approvePost } from '@/lib/admin';
import { getPostById } from '@/lib/posts';
import { createServiceSupabase } from '@/lib/supabase/service';

export type TelegramApproveResult =
	| { ok: true; scheduled: boolean }
	| { ok: false; error: string };

export type ApproveTelegramDeps = {
	supabase?: SupabaseClient;
	getPost?: typeof getPostById;
	approve?: typeof approvePost;
};

/** Akceptacja z Telegrama — tylko `pending`; szkic nadal wymaga panelu. */
export async function approvePendingFromTelegram(
	postId: string,
	deps: ApproveTelegramDeps = {},
): Promise<TelegramApproveResult> {
	const supabase = deps.supabase ?? createServiceSupabase();
	const post = await (deps.getPost ?? getPostById)(supabase, postId);
	if (!post) return { ok: false, error: 'not_found' };
	if (post.status !== 'pending') return { ok: false, error: 'not_pending' };
	return (deps.approve ?? approvePost)(supabase, post);
}
