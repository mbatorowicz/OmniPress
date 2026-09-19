import { describe, expect, it } from 'vitest';
import type { InboundDraftConfig } from './config';
import { resolveInboundSiteSlug } from './inbound-site';

const CONFIG: InboundDraftConfig = {
	allowedFrom: 'ja@cncsolutions.dev',
	defaultSiteSlug: 'gmina-miedzna',
	fallbackAuthorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	siteByEmail: {},
	siteByDomain: [
		{ domain: 'gminamiedzna.pl', slug: 'gmina-miedzna' },
		{ domain: 'sp-miedzna.pl', slug: 'sp-miedzna' },
	],
};

const BODY = `---------- Forwarded message ---------
From: Sekretariat <sekretariat@sp-miedzna.pl>
To: ja@cncsolutions.dev

---------- Forwarded message ---------
From: Powiat <wet@powiat.siedlce.pl>
`;

describe('resolveInboundSiteSlug', () => {
	it('bierze hop tuż przed Tobą; envelope i pismo olewa', () => {
		expect(resolveInboundSiteSlug(BODY, 'Ja <ja@cncsolutions.dev>', CONFIG)).toBe('sp-miedzna');
		expect(resolveInboundSiteSlug('Bez forwardu', 'ja@cncsolutions.dev', CONFIG)).toBe(
			'gmina-miedzna',
		);
	});
});
