import { parseCertAdvisoriesRss } from './parse-rss';
import type { CertAdvisory } from './types';
import { CERT_ADVISORIES_FEED_URL } from './types';

const CACHE_TTL_MS = 15 * 60 * 1000;

let cachedEntries: CertAdvisory[] | null = null;
let cachedAt = 0;

export function clearCertAdvisoriesCache(): void {
	cachedEntries = null;
	cachedAt = 0;
}

export async function fetchCertAdvisories(force = false): Promise<CertAdvisory[]> {
	const now = Date.now();
	if (!force && cachedEntries && now - cachedAt < CACHE_TTL_MS) {
		return cachedEntries;
	}

	const response = await fetch(CERT_ADVISORIES_FEED_URL, {
		headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
	});

	if (!response.ok) {
		throw new Error(`cert_feed_${response.status}`);
	}

	const xml = await response.text();
	const entries = parseCertAdvisoriesRss(xml);
	cachedEntries = entries;
	cachedAt = now;
	return entries;
}
