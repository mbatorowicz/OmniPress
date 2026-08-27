import type { SupabaseClient } from '@supabase/supabase-js';
import type { Site } from '@/lib/types';
import type { DestinationForPublish } from '@/lib/publish/types';

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
	// PostgREST zwraca embed many-to-one jako obiekt; klient bez wygenerowanych typów zgaduje tablicę.
	return (data ?? []) as unknown as SiteDestinationLink[];
}

/** Aktywna destynacja GitHub/Astro przypisana do strony (1:1 w UI). */
export async function loadSiteAstroDestination(
	supabase: SupabaseClient,
	siteId: string,
): Promise<DestinationForPublish | null> {
	const links = await getSiteDestinations(supabase, siteId);
	const link = links.find((l) => l.destinations?.type === 'github_astro');
	if (!link) return null;

	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, encrypted_credentials, is_active')
		.eq('id', link.destination_id)
		.maybeSingle();

	const dest = (data as DestinationForPublish | null) ?? null;
	if (!dest?.is_active) return null;
	return dest;
}

export async function resolveSitePublishDestinationIds(
	supabase: SupabaseClient,
	siteId: string,
): Promise<string[]> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	return dest ? [dest.id] : [];
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

	const links = await getSiteDestinations(supabase, siteId);
	await supabase.from('site_destinations').delete().eq('site_id', siteId);

	for (const link of links) {
		const logs = await countDestinationPublishLogs(supabase, link.destination_id);
		if (logs === 0) {
			await supabase.from('destinations').delete().eq('id', link.destination_id);
		}
	}

	const { error } = await supabase.from('sites').delete().eq('id', siteId);
	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}

async function countDestinationPublishLogs(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<number> {
	const { count } = await supabase
		.from('publish_logs')
		.select('id', { count: 'exact', head: true })
		.eq('destination_id', destinationId);
	return count ?? 0;
}
