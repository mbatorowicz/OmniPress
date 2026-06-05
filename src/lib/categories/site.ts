import type { SupabaseClient } from '@supabase/supabase-js';
import { getDestinationById } from '@/lib/admin/destinations';
import type { DestinationForPublish } from '@/lib/publish/types';
import { fetchAstroCategories } from './astro-github';
import type { CategoryOption } from './types';

async function loadDestinationForCategories(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<DestinationForPublish | null> {
	const row = await getDestinationById(supabase, destinationId);
	if (!row || row.type !== 'github_astro') return null;
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

/** Kategorie z aktywnego kanału Astro przypisanego do strony. */
export async function loadSiteCategories(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ categories: CategoryOption[]; warnings: string[] }> {
	const { data: links } = await supabase
		.from('site_destinations')
		.select('destination_id, destinations(id, type, is_active)')
		.eq('site_id', siteId);

	const warnings: string[] = [];
	const categories: CategoryOption[] = [];

	for (const link of links ?? []) {
		const dest = link.destinations as { id: string; type: string; is_active: boolean } | null;
		if (!dest?.is_active || dest.type !== 'github_astro') continue;

		const full = await loadDestinationForCategories(supabase, dest.id);
		if (!full) continue;

		try {
			categories.push(...(await fetchAstroCategories(full)));
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'nieznany błąd';
			warnings.push(`${full.name}: ${msg}`);
		}
	}

	return {
		categories: [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
		warnings,
	};
}
