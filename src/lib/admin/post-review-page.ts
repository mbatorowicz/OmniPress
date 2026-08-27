/**
 * Dane strony akceptacji wpisu (`/admin/posts/[id]`): kto i gdzie publikuje,
 * podgląd treści oraz historia publikacji.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminUsers } from '@/i18n';
import { canReopenPost } from '@/lib/admin/posts';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import type { DestinationForPublish } from '@/lib/publish/types';
import { listPublishLogsForPost, type PublishLogRow } from '@/lib/publish';
import { getPostById, type PostRow } from '@/lib/posts/access';
import { loadPostPreview, type PostPreview } from '@/lib/posts/post-preview';

export type PostReviewPage = {
	post: PostRow;
	siteName: string | null;
	/** `null` tylko wtedy, gdy konto autora zostało usunięte razem z profilem. */
	authorName: string | null;
	siteChannel: DestinationForPublish | null;
	publishLogs: PublishLogRow[];
	isPending: boolean;
	canManagePinned: boolean;
	canReopen: boolean;
	preview: PostPreview;
};

export async function loadPostReviewPage(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostReviewPage | null> {
	const post = await getPostById(supabase, postId);
	if (!post) return null;

	const [{ data: site }, siteChannel, publishLogs, preview] = await Promise.all([
		supabase.from('sites').select('name').eq('id', post.site_id).single(),
		loadSiteAstroDestination(supabase, post.site_id),
		listPublishLogsForPost(supabase, post.id),
		loadPostPreview(supabase, post.id, post.content_md),
	]);

	const { data: author } = post.author_id
		? await supabase
				.from('profiles')
				.select('display_name')
				.eq('id', post.author_id)
				.maybeSingle()
		: { data: null };

	return {
		post,
		siteName: site?.name ?? null,
		authorName: author?.display_name ?? (post.author_id ? null : adminUsers.deletedAuthor),
		siteChannel,
		publishLogs,
		isPending: post.status === 'pending',
		canManagePinned: post.status === 'published' || post.status === 'scheduled',
		canReopen: await canReopenPost(supabase, post.id, post.status),
		preview,
	};
}
