import { resolvePostSlug } from '@/lib/publish/paths';
import type { PostForPublish } from '@/lib/publish/types';
import type { RecentChangeEntry } from './types';

export function buildPostRecentChangeEntry(
	post: PostForPublish,
	slug: string,
): RecentChangeEntry {
		if (!post.category_slug?.trim()) {
			throw new Error('Brak kategorii wpisu');
		}
		const category = post.category_slug.trim();
	const changedAt = post.updated_at ?? new Date().toISOString();
	return {
		title: post.title,
		href: `/${category}/${slug}`,
		kind: 'news',
		changedAt,
		sourceId: post.id,
	};
}

export function resolveSlugForRecentChange(post: PostForPublish): string {
	return resolvePostSlug(post);
}
