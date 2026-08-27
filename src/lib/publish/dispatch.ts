import type { SupabaseClient } from '@supabase/supabase-js';
import { publishToGitHubAstro } from './github-astro';
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';

export async function dispatchPublish(
	supabase: SupabaseClient,
	post: PostForPublish,
	destination: DestinationForPublish,
	existingExternalId?: string | null,
): Promise<PublishResult> {
	if (destination.type === 'github_astro') {
		return publishToGitHubAstro(supabase, post, destination, existingExternalId);
	}
	return { ok: false, summary: `Nieobsługiwany typ destynacji: ${destination.type}`, retryable: false };
}

export async function loadPostForPublish(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostForPublish | null> {
	const { data } = await supabase
		.from('posts')
		.select(
			'id, site_id, title, slug, content_md, status, updated_at, scheduled_publish_at, category_slug, category_name, pinned',
		)
		.eq('id', postId)
		.maybeSingle();
	return (data as PostForPublish | null) ?? null;
}

export async function loadDestinationForPublish(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<DestinationForPublish | null> {
	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, encrypted_credentials, is_active')
		.eq('id', destinationId)
		.maybeSingle();
	return (data as DestinationForPublish | null) ?? null;
}
