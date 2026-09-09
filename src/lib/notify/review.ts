import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostRow } from '@/lib/posts/access-model';
import { formatReviewMessage } from './review-model';
import { isTelegramConfigured, sendTelegramMessage } from './telegram';

export type ReviewNotifyPost = Pick<PostRow, 'id' | 'title' | 'site_id' | 'author_id'>;

export type NotifyPostSubmittedOptions = {
	configured?: boolean;
	send?: (text: string) => Promise<void>;
};

async function loadSiteName(supabase: SupabaseClient, siteId: string): Promise<string | null> {
	const { data } = await supabase.from('sites').select('name').eq('id', siteId).maybeSingle();
	return (data as { name?: string } | null)?.name ?? null;
}

async function loadAuthorName(
	supabase: SupabaseClient,
	authorId: string | null,
): Promise<string | null> {
	if (!authorId) return null;
	const { data } = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', authorId)
		.maybeSingle();
	return (data as { display_name?: string | null } | null)?.display_name ?? null;
}

export async function notifyPostSubmitted(
	supabase: SupabaseClient,
	post: ReviewNotifyPost,
	opts: NotifyPostSubmittedOptions = {},
): Promise<void> {
	try {
		const configured = opts.configured ?? isTelegramConfigured();
		if (!configured) return;

		const [siteName, authorName] = await Promise.all([
			loadSiteName(supabase, post.site_id),
			loadAuthorName(supabase, post.author_id),
		]);
		const text = formatReviewMessage({
			title: post.title,
			siteName,
			authorName,
			postId: post.id,
		});
		await (opts.send ?? sendTelegramMessage)(text);
	} catch {
		// Submit już zapisany — powiadomienie nie może go cofnąć.
	}
}
