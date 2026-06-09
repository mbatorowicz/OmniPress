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

export type CertAdvisoriesFile = {
	updatedAt: string;
	entries: CertAdvisory[];
};

export const DEFAULT_CERT_ADVISORIES_PATH = 'src/config/omnipress-cert-advisories.json';

export function emptyCertAdvisoriesFile(): CertAdvisoriesFile {
	return { updatedAt: new Date().toISOString(), entries: [] };
}

export function certAdvisoriesPath(config: Record<string, unknown>): string {
	const raw = config.cert_advisories_path;
	return typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_CERT_ADVISORIES_PATH;
}
