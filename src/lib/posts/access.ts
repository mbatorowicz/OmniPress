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
	pinned: boolean;
};

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

/** Redaktor poprawia własny wpis tylko przed wysłaniem do akceptacji. */
const AUTHOR_EDITABLE_STATUSES: readonly PostStatus[] = ['draft', 'rejected'];

/**
 * Administrator poprawia wpis dopóki treść nie ruszyła na stronę — także po
 * wysłaniu do akceptacji (`pending`) i po zaplanowaniu publikacji (`scheduled`).
 * `publishing` i `published` są wyłączone: tam wchodzi się przez poprawkę
 * (`reopen`) albo zdjęcie ze strony.
 */
const ADMIN_EDITABLE_STATUSES: readonly PostStatus[] = [
	'draft',
	'rejected',
	'pending',
	'scheduled',
];

export function canAdminEditPost(post: PostRow): boolean {
	return ADMIN_EDITABLE_STATUSES.includes(post.status);
}

export function canEditPost(post: PostRow, userId: string, role: UserRole): boolean {
	if (role === 'admin') return canAdminEditPost(post);
	return post.author_id === userId && AUTHOR_EDITABLE_STATUSES.includes(post.status);
}

/** Podgląd załączników (PDF) — admin: każdy wpis; redaktor: własne. */
export function canViewPostAssets(post: PostRow, userId: string, role: UserRole): boolean {
	if (role === 'admin') return true;
	return post.author_id === userId;
}

export function canSubmitPost(post: PostRow, userId: string): boolean {
	return post.author_id === userId && (post.status === 'draft' || post.status === 'rejected');
}

/** Redaktor usuwa tylko własne wpisy przed publikacją (szkic / odrzucony). */
export function canDeletePost(post: PostRow, userId: string): boolean {
	return post.author_id === userId && (post.status === 'draft' || post.status === 'rejected');
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

