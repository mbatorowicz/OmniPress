import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostStatus, UserRole } from '../types';

export type PostRow = {
	id: string;
	author_id: string;
	site_id: string;
	title: string;
	content_md: string;
	slug: string | null;
	status: PostStatus;
	rejection_note: string | null;
	category_slug: string | null;
	category_name: string | null;
	wp_category_id: number | null;
};

export async function getPostById(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostRow | null> {
	const { data, error } = await supabase
		.from('posts')
		.select(
			'id, author_id, site_id, title, content_md, slug, status, rejection_note, category_slug, category_name, wp_category_id',
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

export function canSubmitPost(post: PostRow, userId: string): boolean {
	return post.author_id === userId && post.status === 'draft';
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
