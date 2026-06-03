import { resolvePostSlug } from '@/lib/publish/paths';
import type { PostForPublish } from '@/lib/publish/types';
import type { RecentChangeEntry } from './types';

export function buildPostRecentChangeEntry(
	post: PostForPublish,
	slug: string,
): RecentChangeEntry {
	const category = post.category_slug?.trim() || 'aktualnosci';
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
