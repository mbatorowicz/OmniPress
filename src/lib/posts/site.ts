import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../types';

export type SiteRow = {
	site_id: string;
	sites: { id: string; name: string; slug: string } | null;
};

export type AllowedSite = { id: string; name: string; slug: string };

export function collectAllowedSites(profile: Profile, userSites: SiteRow[]): AllowedSite[] {
	const map = new Map<string, AllowedSite>();

	for (const row of userSites) {
		if (row.sites) map.set(row.sites.id, row.sites);
	}

	if (profile.default_site_id && !map.has(profile.default_site_id)) {
		const fromRow = userSites.find((r) => r.site_id === profile.default_site_id)?.sites;
		if (fromRow) map.set(fromRow.id, fromRow);
	}

	return [...map.values()];
}

/** Jedna funkcja dla UI i API — ładuje default_site_id z bazy gdy brak user_sites. */
export async function loadAllowedSites(
	supabase: SupabaseClient,
	profile: Profile,
	userSites: SiteRow[],
): Promise<AllowedSite[]> {
	let allowed = collectAllowedSites(profile, userSites);

	if (allowed.length === 0 && profile.default_site_id) {
		const { data: site } = await supabase
			.from('sites')
			.select('id, name, slug')
			.eq('id', profile.default_site_id)
			.eq('is_active', true)
			.single();
		if (site) allowed = [site];
	}

	return allowed;
}

export function resolveSiteIdForNewPost(
	profile: Profile,
	allowedSites: AllowedSite[],
	requestedSiteId?: string | null,
): string | null {
	if (allowedSites.length === 0) return null;
	if (requestedSiteId && allowedSites.some((s) => s.id === requestedSiteId)) {
		return requestedSiteId;
	}
	if (profile.default_site_id && allowedSites.some((s) => s.id === profile.default_site_id)) {
		return profile.default_site_id;
	}
	return allowedSites[0]?.id ?? null;
}
