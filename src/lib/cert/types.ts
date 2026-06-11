/** Kategorie kanału RSS CERT Polska — filtr widgetu w panelu Layout Astro. */
export const CERT_CATEGORIES = [
	'Dla użytkowników',
	'Dla administratorów',
	'Raporty miesięczne CERT Polska',
	'Wydarzenia',
] as const;

export type CertCategory = (typeof CERT_CATEGORIES)[number];
