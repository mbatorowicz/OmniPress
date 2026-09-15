import type { SupabaseClient } from '@supabase/supabase-js';
import { findExistingPostId } from './import-publish-log';

export type ExistingPost = {
	id: string;
	status: string;
	content_md: string;
	live_blob_sha: string | null;
	published_content_sha: string | null;
};

export type ExistingPostIndex = {
	byId: Map<string, ExistingPost>;
	idBySlug: Map<string, string>;
	idByExternal: Map<string, string>;
};

type PostRow = ExistingPost & { slug?: string | null };
type LogRow = { post_id?: string | null; external_id?: string | null };

export function existingFromIndex(
	index: ExistingPostIndex,
	externalId: string,
	slug: string,
): { existingId: string | null; existing: ExistingPost | null } {
	const fromExt = index.idByExternal.get(externalId);
	const existingId =
		(fromExt && index.byId.has(fromExt) ? fromExt : null) ?? index.idBySlug.get(slug) ?? null;
	return { existingId, existing: existingId ? (index.byId.get(existingId) ?? null) : null };
}

export async function loadExistingPostIndex(
	supabase: SupabaseClient,
	siteId: string,
	destinationId: string,
): Promise<ExistingPostIndex> {
	const [{ data: posts }, { data: logs }] = await Promise.all([
		supabase
			.from('posts')
			.select('id, slug, status, content_md, live_blob_sha, published_content_sha')
			.eq('site_id', siteId),
		supabase
			.from('publish_logs')
			.select('post_id, external_id')
			.eq('destination_id', destinationId)
			.order('created_at', { ascending: false }),
	]);

	const byId = new Map<string, ExistingPost>();
	const idBySlug = new Map<string, string>();
	for (const row of (posts ?? []) as PostRow[]) {
		byId.set(row.id, {
			id: row.id,
			status: row.status,
			content_md: row.content_md,
			live_blob_sha: row.live_blob_sha,
			published_content_sha: row.published_content_sha,
		});
		if (row.slug) idBySlug.set(row.slug, row.id);
	}

	const idByExternal = new Map<string, string>();
	for (const log of (logs ?? []) as LogRow[]) {
		if (!log.external_id || !log.post_id || idByExternal.has(log.external_id)) continue;
		idByExternal.set(log.external_id, log.post_id);
	}

	return { byId, idBySlug, idByExternal };
}

export async function resolveExistingPost(
	supabase: SupabaseClient,
	siteId: string,
	destinationId: string,
	externalId: string,
	slug: string,
	index?: ExistingPostIndex,
): Promise<{ existingId: string | null; existing: ExistingPost | null }> {
	if (index) return existingFromIndex(index, externalId, slug);

	const existingId = await findExistingPostId(supabase, siteId, destinationId, externalId, slug);
	if (!existingId) return { existingId: null, existing: null };
	const { data } = await supabase
		.from('posts')
		.select('id, status, content_md, live_blob_sha, published_content_sha')
		.eq('id', existingId)
		.maybeSingle();
	return { existingId, existing: (data as ExistingPost | null) ?? null };
}
