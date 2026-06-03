import type { SupabaseClient } from '@supabase/supabase-js';
import { getDestinationById } from '@/lib/admin/destinations';
import type { DestinationForPublish } from '@/lib/publish/types';
import { fetchAstroCategories } from './astro-github';
import { mergeCategoryLists } from './merge';
import type { CategoryOption } from './types';
import { fetchWordPressCategories } from './wordpress';

async function loadDestinationForCategories(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<DestinationForPublish | null> {
	const row = await getDestinationById(supabase, destinationId);
	if (!row) return null;
	const { data } = await supabase
		.from('destinations')
		.select('encrypted_credentials')
		.eq('id', destinationId)
		.maybeSingle();
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		config: row.config,
		encrypted_credentials: (data?.encrypted_credentials as string | null) ?? null,
		is_active: row.is_active,
	};
}

/** Kategorie z wszystkich aktywnych kanałów przypisanych do strony. */
export async function loadSiteCategories(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ categories: CategoryOption[]; warnings: string[] }> {
	const { data: links } = await supabase
		.from('site_destinations')
		.select('destination_id, destinations(id, type, is_active)')
		.eq('site_id', siteId);

	const warnings: string[] = [];
	const lists: CategoryOption[][] = [];

	for (const link of links ?? []) {
		const dest = link.destinations as { id: string; type: string; is_active: boolean } | null;
		if (!dest?.is_active) continue;

		const full = await loadDestinationForCategories(supabase, dest.id);
		if (!full) continue;

		try {
			if (full.type === 'wordpress') {
				lists.push(await fetchWordPressCategories(full));
			} else if (full.type === 'github_astro') {
				lists.push(await fetchAstroCategories(full));
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'nieznany błąd';
			warnings.push(`${full.name}: ${msg}`);
		}
	}

	return { categories: mergeCategoryLists(lists), warnings };
}
