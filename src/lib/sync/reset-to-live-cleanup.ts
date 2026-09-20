import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteSitePage, listSitePages } from '@/lib/site-pages/access';
import { buildSitePagePublicPath } from '@/lib/site-pages/url';

const UNPUBLISHED = ['draft', 'pending', 'rejected', 'scheduled', 'publishing'] as const;
const OPEN_LOG = ['pending', 'processing'] as const;

/** Zamyka kolejkę publikacji — nic nie idzie na GitHub. Log z origin wraca na success. */
export async function cancelOpenPublishJobs(
	supabase: SupabaseClient,
	siteId: string,
): Promise<number> {
	const { data: posts } = await supabase.from('posts').select('id').eq('site_id', siteId);
	const ids = ((posts ?? []) as { id?: string }[])
		.map((row) => row.id)
		.filter((id): id is string => Boolean(id));
	if (ids.length === 0) return 0;

	const { data: logs } = await supabase
		.from('publish_logs')
		.select('id, external_id')
		.in('post_id', ids)
		.in('status', [...OPEN_LOG]);
	const rows = (logs ?? []) as { id?: string; external_id?: string | null }[];
	let cancelled = 0;
	for (const log of rows) {
		if (!log.id) continue;
		const next = log.external_id
			? { status: 'success' as const, next_retry_at: null, retry_count: 0 }
			: { status: 'withdrawn' as const, next_retry_at: null };
		const { error } = await supabase.from('publish_logs').update(next).eq('id', log.id);
		if (!error) cancelled += 1;
	}
	return cancelled;
}

/** Kasuje szkice Omni, których nie ma na origin — bez withdraw z GitHub. */
export async function deleteOmniOnlyUnpublishedPosts(
	supabase: SupabaseClient,
	siteId: string,
	liveSlugs: Set<string>,
): Promise<number> {
	const { data } = await supabase
		.from('posts')
		.select('id, slug')
		.eq('site_id', siteId)
		.in('status', [...UNPUBLISHED]);
	const stale = ((data ?? []) as { id?: string; slug?: string | null }[])
		.filter((row) => row.id && (!row.slug || !liveSlugs.has(row.slug)))
		.map((row) => row.id as string);
	if (stale.length === 0) return 0;

	const { data: assets } = await supabase.from('assets').select('storage_path').in('post_id', stale);
	const paths = ((assets ?? []) as { storage_path?: unknown }[])
		.map((row) => row.storage_path)
		.filter((path): path is string => typeof path === 'string' && path.length > 0);
	if (paths.length > 0) {
		await supabase.storage.from('post-assets').remove(paths);
	}
	await supabase.from('posts').delete().in('id', stale);
	return stale.length;
}

/** Kasuje szkice stron, których nie ma na origin. */
export async function deleteOmniOnlyDraftPages(
	supabase: SupabaseClient,
	siteId: string,
	liveHrefs: Set<string>,
): Promise<number> {
	const pages = await listSitePages(supabase, siteId);
	const stale = pages.filter(
		(page) =>
			page.status !== 'published' &&
			!liveHrefs.has(buildSitePagePublicPath(page.path_prefix, page.slug)),
	);
	let deleted = 0;
	for (const page of stale) {
		if (await deleteSitePage(supabase, page.id)) deleted += 1;
	}
	return deleted;
}
