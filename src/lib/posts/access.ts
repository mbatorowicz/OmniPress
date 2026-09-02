import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '../types';
import { canEditPost, canSubmitPost, type PostRow } from './access-model';

export {
	canAdminEditPost,
	canDeletePost,
	canEditPost,
	canSubmitPost,
	canViewPostAssets,
	isAdminEditableStatus,
	type PostRow,
} from './access-model';

export async function getPostById(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostRow | null> {
	const { data, error } = await supabase
		.from('posts')
		.select(
			'id, author_id, site_id, title, content_md, slug, status, rejection_note, category_slug, category_name, scheduled_publish_at, pinned',
		)
		.eq('id', postId)
		.maybeSingle();

	if (error || !data) return null;
	return data as PostRow;
}

/** Wpis do edycji lub null gdy brak dostępu. */
export async function loadEditablePost(
	supabase: SupabaseClient,
	postId: string,
	userId: string,
	role: UserRole,
): Promise<PostRow | null> {
	const post = await getPostById(supabase, postId);
	if (!post || !canEditPost(post, userId, role)) return null;
	return post;
}

/** Wpis do wysłania do akceptacji lub null. */
export async function loadSubmittablePost(
	supabase: SupabaseClient,
	postId: string,
	userId: string,
): Promise<PostRow | null> {
	const post = await getPostById(supabase, postId);
	if (!post || !canSubmitPost(post, userId)) return null;
	return post;
}
