import type { SupabaseClient } from '@supabase/supabase-js';
import type { Site } from '@/lib/types';

export async function listSites(supabase: SupabaseClient): Promise<Site[]> {
	const { data } = await supabase.from('sites').select('*').order('name');
	return (data ?? []) as Site[];
}

export async function getSiteById(supabase: SupabaseClient, id: string): Promise<Site | null> {
	const { data } = await supabase.from('sites').select('*').eq('id', id).maybeSingle();
	return (data as Site | null) ?? null;
}

export type SiteDestinationLink = {
	destination_id: string;
	is_default: boolean;
	sort_order: number;
	destinations: { id: string; name: string; type: string } | null;
};

export async function getSiteDestinations(
	supabase: SupabaseClient,
	siteId: string,
): Promise<SiteDestinationLink[]> {
	const { data } = await supabase
		.from('site_destinations')
		.select('destination_id, is_default, sort_order, destinations(id, name, type)')
		.eq('site_id', siteId)
		.order('sort_order');
	return (data ?? []) as SiteDestinationLink[];
}

export async function countSitePosts(supabase: SupabaseClient, siteId: string): Promise<number> {
	const { count } = await supabase
		.from('posts')
		.select('id', { count: 'exact', head: true })
		.eq('site_id', siteId);
	return count ?? 0;
}

export async function deleteSite(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'has_posts' | 'delete_failed' }> {
	const posts = await countSitePosts(supabase, siteId);
	if (posts > 0) return { ok: false, error: 'has_posts' };

	const { data: site } = await supabase.from('sites').select('id').eq('id', siteId).maybeSingle();
	if (!site) return { ok: false, error: 'not_found' };

	await supabase.from('profiles').update({ default_site_id: null }).eq('default_site_id', siteId);
	await supabase.from('user_sites').delete().eq('site_id', siteId);
	await supabase.from('site_destinations').delete().eq('site_id', siteId);

	const { error } = await supabase.from('sites').delete().eq('id', siteId);
	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}

export async function countDestinationPublishLogs(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<number> {
	const { count } = await supabase
		.from('publish_logs')
		.select('id', { count: 'exact', head: true })
		.eq('destination_id', destinationId);
	return count ?? 0;
}

export async function deleteDestination(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'has_logs' | 'delete_failed' }> {
	const { data: dest } = await supabase
		.from('destinations')
		.select('id')
		.eq('id', destinationId)
		.maybeSingle();
	if (!dest) return { ok: false, error: 'not_found' };

	const logs = await countDestinationPublishLogs(supabase, destinationId);
	if (logs > 0) return { ok: false, error: 'has_logs' };

	await supabase.from('site_destinations').delete().eq('destination_id', destinationId);

	const { error } = await supabase.from('destinations').delete().eq('id', destinationId);
	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}
