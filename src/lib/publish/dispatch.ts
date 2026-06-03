import type { SupabaseClient } from '@supabase/supabase-js';
import { publishToGitHubAstro, publishToWordPress } from './wordpress';
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';

export async function dispatchPublish(
	post: PostForPublish,
	destination: DestinationForPublish,
): Promise<PublishResult> {
	if (destination.type === 'wordpress') {
		return publishToWordPress(post, destination);
	}
	if (destination.type === 'github_astro') {
		return publishToGitHubAstro(post, destination);
	}
	return { ok: false, summary: `Nieznany typ destynacji: ${destination.type}`, retryable: false };
}

export async function loadPostForPublish(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostForPublish | null> {
	const { data } = await supabase
		.from('posts')
		.select('id, site_id, title, slug, content_md, status')
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
