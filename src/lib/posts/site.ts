import type { Profile } from '../types';

type SiteRow = { site_id: string; sites: { id: string; name: string; slug: string } | null };

export function collectAllowedSites(
	profile: Profile,
	userSites: SiteRow[],
): { id: string; name: string; slug: string }[] {
	const map = new Map<string, { id: string; name: string; slug: string }>();

	for (const row of userSites) {
		if (row.sites) map.set(row.sites.id, row.sites);
	}

	if (profile.default_site_id && !map.has(profile.default_site_id)) {
		const fromRow = userSites.find((r) => r.site_id === profile.default_site_id)?.sites;
		if (fromRow) map.set(fromRow.id, fromRow);
	}

	return [...map.values()];
}

export function resolveSiteIdForNewPost(
	profile: Profile,
	allowedSites: { id: string }[],
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
