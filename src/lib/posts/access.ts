import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostStatus, UserRole } from '../types';

export type PostRow = {
	id: string;
	/** Null po usunięciu konta autora (FK on delete set null). */
	author_id: string | null;
	site_id: string;
	title: string;
	content_md: string;
	slug: string | null;
	status: PostStatus;
	rejection_note: string | null;
	category_slug: string | null;
	category_name: string | null;
	scheduled_publish_at: string | null;
};

export async function getPostById(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostRow | null> {
	const { data, error } = await supabase
		.from('posts')
		.select(
			'id, author_id, site_id, title, content_md, slug, status, rejection_note, category_slug, category_name, scheduled_publish_at',
		)
		.eq('id', postId)
		.maybeSingle();

	if (error || !data) return null;
	return data as PostRow;
}

export function canEditPost(post: PostRow, userId: string, role: UserRole): boolean {
	if (role === 'admin') return post.status === 'draft' || post.status === 'rejected';
	return post.author_id === userId && (post.status === 'draft' || post.status === 'rejected');
}

/** Podgląd załączników (PDF) — admin: każdy wpis; redaktor: własne. */
export function canViewPostAssets(post: PostRow, userId: string, role: UserRole): boolean {
	if (role === 'admin') return true;
	return post.author_id === userId;
}

export function canSubmitPost(post: PostRow, userId: string): boolean {
	return post.author_id === userId && post.status === 'draft';
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

export function slugFromTitle(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}
