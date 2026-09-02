/**
 * Powiazanie wpisu OmniPress z plikiem w repo Astro przy imporcie —
 * odszukanie istniejacego wpisu i wpis do `publish_logs`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const IMPORT_SUMMARY = 'Import z GitHub';

/** Istniejacy wpis dla pliku z repo: najpierw po external_id, potem po slugu. */
export async function findExistingPostId(
	supabase: SupabaseClient,
	siteId: string,
	destinationId: string,
	externalId: string,
	slug: string,
): Promise<string | null> {
	const { data: byExternal } = await supabase
		.from('publish_logs')
		.select('post_id')
		.eq('destination_id', destinationId)
		.eq('external_id', externalId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (byExternal?.post_id) return byExternal.post_id as string;

	const { data: bySlug } = await supabase
		.from('posts')
		.select('id')
		.eq('site_id', siteId)
		.eq('slug', slug)
		.maybeSingle();
	return (bySlug?.id as string | undefined) ?? null;
}

/** Zapisuje udana publikacje dla importowanego wpisu (bez dublowania logu). */
export async function ensureSuccessPublishLog(
	supabase: SupabaseClient,
	postId: string,
	destinationId: string,
	externalId: string,
	publishedAt: string | null,
): Promise<void> {
	const payload = {
		status: 'success' as const,
		external_id: externalId,
		response_summary: IMPORT_SUMMARY,
		published_at: publishedAt ?? new Date().toISOString(),
		retry_count: 0,
		next_retry_at: null,
	};

	const { data: existing } = await supabase
		.from('publish_logs')
		.select('id')
		.eq('post_id', postId)
		.eq('destination_id', destinationId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (existing?.id) {
		await supabase.from('publish_logs').update(payload).eq('id', existing.id);
		return;
	}

	await supabase.from('publish_logs').insert({
		post_id: postId,
		destination_id: destinationId,
		...payload,
	});
}
