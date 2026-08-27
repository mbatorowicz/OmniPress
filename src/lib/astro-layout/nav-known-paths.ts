/**
 * Zbiór ścieżek, które strona faktycznie wystawia — podstawa walidacji linków menu.
 * Osobno od `validate-nav.ts`, bo sięga do bazy, a walidatory jadą do przeglądarki
 * razem z edytorem menu.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { listPublishedSitePagePaths } from '@/lib/site-pages';
import { normalizeInternalHref } from './validate-nav';

export async function buildKnownNavPaths(
	supabase: SupabaseClient,
	siteId: string,
	categorySlugs: string[],
	extraPaths: string[] = ['/'],
): Promise<Set<string>> {
	const pagePaths = await listPublishedSitePagePaths(supabase, siteId);
	const paths = new Set<string>(extraPaths.map(normalizeInternalHref));

	for (const slug of categorySlugs) {
		if (slug.trim()) paths.add(normalizeInternalHref(`/${slug.trim()}`));
	}
	for (const p of pagePaths) paths.add(normalizeInternalHref(p));

	return paths;
}
