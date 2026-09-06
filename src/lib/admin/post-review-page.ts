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
import {
	canAdminEditPost,
	getPostById,
	isApprovableStatus,
	missingForPublish,
	type MissingForPublish,
	type PostRow,
} from '@/lib/posts/access';
import { extraCategoryNames } from '@/lib/posts/category-model';
import { loadSiteCategories } from '@/lib/categories';
import { loadPostPreview, type PostPreview } from '@/lib/posts/post-preview';

export type PostReviewPage = {
	post: PostRow;
	siteName: string | null;
	/** `null` tylko wtedy, gdy konto autora zostało usunięte razem z profilem. */
	authorName: string | null;
	siteChannel: DestinationForPublish | null;
	publishLogs: PublishLogRow[];
	/** Wpis czeka na decyzję — dopiero wtedy odrzucenie z uwagami ma sens. */
	isPending: boolean;
	/** Skierowanie do publikacji — także szkic i wpis do poprawki. */
	canApprove: boolean;
	/** Czego brakuje do publikacji (`null` = wpis gotowy). */
	missingForPublish: MissingForPublish;
	/** Korekta treści przez admina — wpis jeszcze nie ruszył na stronę. */
	canEdit: boolean;
	canManagePinned: boolean;
	canReopen: boolean;
	preview: PostPreview;
	extraCategoryNames: string[];
};

export async function loadPostReviewPage(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostReviewPage | null> {
	const post = await getPostById(supabase, postId);
	if (!post) return null;

	const [{ data: site }, siteChannel, publishLogs, preview, categoriesResult] = await Promise.all([
		supabase.from('sites').select('name').eq('id', post.site_id).single(),
		loadSiteAstroDestination(supabase, post.site_id),
		listPublishLogsForPost(supabase, post.id),
		loadPostPreview(supabase, post.id, post.content_md),
		loadSiteCategories(supabase, post.site_id),
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
		canApprove: isApprovableStatus(post.status),
		missingForPublish: missingForPublish(post),
		canEdit: canAdminEditPost(post),
		canManagePinned: post.status === 'published' || post.status === 'scheduled',
		canReopen: await canReopenPost(supabase, post.id, post.status),
		preview,
		extraCategoryNames: extraCategoryNames(
			post.extra_category_slugs ?? [],
			categoriesResult.categories,
		),
	};
}
