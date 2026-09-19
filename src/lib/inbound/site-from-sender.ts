export type SiteSenderMaps = {
	byEmail: Record<string, string>;
	byDomain: { domain: string; slug: string }[];
	defaultSlug: string;
};

function parsePairs(raw: string | undefined, sep: string): [string, string][] {
	if (!raw?.trim()) return [];
	const out: [string, string][] = [];
	for (const part of raw.split(/[,\n]/)) {
		const [left, right] = part.split(sep);
		const key = left?.trim().toLowerCase() ?? '';
		const slug = right?.trim() ?? '';
		if (!key || !slug) continue;
		out.push([key, slug]);
	}
	return out;
}

export function parseSiteByEmail(raw: string | undefined): Record<string, string> {
	return Object.fromEntries(parsePairs(raw, ':'));
}

export function parseSiteByDomain(raw: string | undefined): { domain: string; slug: string }[] {
	return parsePairs(raw, ':').map(([domain, slug]) => ({ domain, slug }));
}

function domainMatches(emailDomain: string, mapped: string): boolean {
	return emailDomain === mapped || emailDomain.endsWith(`.${mapped}`);
}

/** Exact email, potem domena (i poddomeny), inaczej default. */
export function siteSlugForSender(email: string | null, maps: SiteSenderMaps): string {
	if (!email) return maps.defaultSlug;
	const lower = email.trim().toLowerCase();
	const exact = maps.byEmail[lower];
	if (exact) return exact;
	const domain = lower.split('@')[1] ?? '';
	if (!domain) return maps.defaultSlug;
	for (const row of maps.byDomain) {
		if (domainMatches(domain, row.domain)) return row.slug;
	}
	return maps.defaultSlug;
}
