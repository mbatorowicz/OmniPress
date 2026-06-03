/** Konwertuje adres strony WP na bazę REST v2 używaną przez publish (`…/wp-json/wp/v2`). */
export function resolveWpRestV2Base(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	try {
		let raw = trimmed;
		if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

		const url = new URL(raw);
		let path = url.pathname.replace(/\/+$/, '') || '';

		if (/\/wp-json\/wp\/v2$/i.test(path)) {
			return `${url.origin}${path}`;
		}
		if (/\/wp-json$/i.test(path)) {
			return `${url.origin}${path}/wp/v2`;
		}

		return `${url.origin}/wp-json/wp/v2`;
	} catch {
		return null;
	}
}

/** Adres do wyświetlenia w formularzu (bez /wp-json/…). */
export function wordpressSiteDisplayUrl(config: Record<string, unknown>): string {
	if (typeof config.wp_site_url === 'string' && config.wp_site_url.trim()) {
		return config.wp_site_url.trim().replace(/\/+$/, '');
	}
	const base = config.wp_rest_base;
	if (typeof base !== 'string' || !base.trim()) return '';
	return base
		.replace(/\/wp-json\/wp\/v2\/?$/i, '')
		.replace(/\/wp-json\/?$/i, '')
		.replace(/\/+$/, '');
}
