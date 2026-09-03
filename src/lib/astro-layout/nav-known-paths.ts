/**
 * Zbiór ścieżek, które strona faktycznie wystawia — podstawa walidacji linków menu.
 * Osobno od `validate-nav.ts`, bo sięga do bazy, a walidatory jadą do przeglądarki
 * razem z edytorem menu.
 *
 * Nie przyjmuje href z drzewa menu (P0-9): to był self-check — `dead_link` nie
 * zapalał się dla pozycji już zapisanej. Select edytora składa opcje osobno
 * (`mergePageOptionsForNavEditor` + `collectNavInternalPageOptions`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { listPublishedSitePagePaths } from '@/lib/site-pages';
import { normalizeInternalHref } from './validate-nav';

/** Trasy Astro bez wiersza w `site_pages` — musi zgadzać się z `STATIC_ROUTE_OPTIONS`. */
export const DEFAULT_STATIC_ROUTES = ['/', '/kontakt'] as const;

export async function buildKnownNavPaths(
	supabase: SupabaseClient,
	siteId: string,
	categorySlugs: string[],
): Promise<Set<string>> {
	const pagePaths = await listPublishedSitePagePaths(supabase, siteId);
	const paths = new Set<string>(DEFAULT_STATIC_ROUTES.map(normalizeInternalHref));

	for (const slug of categorySlugs) {
		if (slug.trim()) paths.add(normalizeInternalHref(`/${slug.trim()}`));
	}
	for (const p of pagePaths) paths.add(normalizeInternalHref(p));

	return paths;
}
