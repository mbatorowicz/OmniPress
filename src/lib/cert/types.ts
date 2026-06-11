export const CERT_ADVISORIES_FEED_URL =
	'https://moje.cert.pl/advisory_feed/advisory/feed/';

export const CERT_CATEGORIES = [
	'Dla użytkowników',
	'Dla administratorów',
	'Raporty miesięczne CERT Polska',
	'Wydarzenia',
] as const;

export type CertCategory = (typeof CERT_CATEGORIES)[number];

export type CertAdvisory = {
	title: string;
	href: string;
	summary: string;
	publishedAt: string;
	category: string;
};

