const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InboundDraftConfig = {
	allowedFrom: string;
	defaultSiteSlug: string;
	fallbackAuthorId: string;
};

/** Env szkicu z poczty. Brak sluga albo UUID autora → null (panel dziala bez inbound). */
export function parseInboundDraftConfig(
	env: Record<string, string | undefined>,
): InboundDraftConfig | null {
	const allowedFrom = env.INBOUND_ALLOWED_FROM?.trim() ?? '';
	const defaultSiteSlug = env.INBOUND_DEFAULT_SITE_SLUG?.trim() ?? '';
	const fallbackAuthorId = env.INBOUND_FALLBACK_AUTHOR_ID?.trim() ?? '';
	if (!defaultSiteSlug || !UUID_RE.test(fallbackAuthorId)) return null;
	return { allowedFrom, defaultSiteSlug, fallbackAuthorId };
}

export function inboundDraftConfig(): InboundDraftConfig | null {
	return parseInboundDraftConfig({
		INBOUND_ALLOWED_FROM: import.meta.env.INBOUND_ALLOWED_FROM,
		INBOUND_DEFAULT_SITE_SLUG: import.meta.env.INBOUND_DEFAULT_SITE_SLUG,
		INBOUND_FALLBACK_AUTHOR_ID: import.meta.env.INBOUND_FALLBACK_AUTHOR_ID,
	});
}
