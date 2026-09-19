import { extractFromEmail, parseAllowlist } from './allowlist';
import type { InboundDraftConfig } from './config';
import { correspondentEmail } from './correspondent';
import { siteSlugForSender } from './site-from-sender';

/** Jednostka z hopu, który przekazał maila do Ciebie — nie envelope i nie autor pisma. */
export function resolveInboundSiteSlug(
	body: string,
	envelopeFrom: string,
	config: InboundDraftConfig,
): string {
	const allowlist = parseAllowlist(config.allowedFrom);
	const envelope = extractFromEmail(envelopeFrom);
	const skip = envelope ? [...allowlist, envelope] : allowlist;
	const hop = correspondentEmail(body, skip);
	return siteSlugForSender(hop, {
		byEmail: config.siteByEmail,
		byDomain: config.siteByDomain,
		defaultSlug: config.defaultSiteSlug,
	});
}
