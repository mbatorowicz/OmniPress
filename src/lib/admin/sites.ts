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
