/**
 * Dane strony wpisu redaktora (`/dashboard/posts/[id]`): uprawnienia, kategorie,
 * podgląd i historia publikacji.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { canReopenPost } from '@/lib/admin/posts';
import { loadSiteCategories } from '@/lib/categories';
import { listPublishLogsForPost } from '@/lib/publish';
import {
	canDeletePost,
	canEditPost,
	canSubmitPost,
	getPostById,
	type PostRow,
} from '@/lib/posts/access';
import { loadPostPreview, type PostPreview } from '@/lib/posts/post-preview';
import type { UserRole } from '@/lib/types';
import type { CategoryOption } from '@/lib/categories/types';

export type PostEditorPage = {
	post: PostRow;
	siteName: string | null;
	editable: boolean;
	submittable: boolean;
	deletable: boolean;
	categories: CategoryOption[];
	categoryWarnings: string[];
	categoriesUnavailable: boolean;
	/** Szkic wpisu, który był już opublikowany — poprawka, nie nowa treść. */
	isAmendment: boolean;
	canReopen: boolean;
	preview: PostPreview;
};

export async function loadPostEditorPage(
	supabase: SupabaseClient,
	postId: string,
	viewer: { userId: string; role: UserRole },
): Promise<PostEditorPage | null> {
	const post = await getPostById(supabase, postId);
	if (!post) return null;

	const [{ data: site }, categoriesResult, preview, publishLogs] = await Promise.all([
		supabase.from('sites').select('name').eq('id', post.site_id).single(),
		loadSiteCategories(supabase, post.site_id),
		loadPostPreview(supabase, post.id, post.content_md),
		listPublishLogsForPost(supabase, post.id),
	]);

	const isAdmin = viewer.role === 'admin';

	return {
		post,
		siteName: site?.name ?? null,
		editable: canEditPost(post, viewer.userId, viewer.role),
		submittable: canSubmitPost(post, viewer.userId, viewer.role),
		deletable: canDeletePost(post, viewer.userId),
		categories: categoriesResult.categories,
		categoryWarnings: categoriesResult.warnings,
		categoriesUnavailable: categoriesResult.categories.length === 0,
		isAmendment:
			post.status === 'draft' &&
			publishLogs.some((log) => log.external_id || log.status === 'withdrawn'),
		canReopen: isAdmin && (await canReopenPost(supabase, post.id, post.status)),
		preview,
	};
}
