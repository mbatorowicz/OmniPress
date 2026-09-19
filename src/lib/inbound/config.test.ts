import { describe, expect, it } from 'vitest';
import { parseInboundDraftConfig } from './config';

const FALLBACK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('parseInboundDraftConfig', () => {
	it('sklada trimowane env; pusta allowlista jest OK', () => {
		expect(
			parseInboundDraftConfig({
				INBOUND_ALLOWED_FROM: '  a@b.c \n',
				INBOUND_DEFAULT_SITE_SLUG: ' gmina-miedzna ',
				INBOUND_FALLBACK_AUTHOR_ID: ` ${FALLBACK} `,
			}),
		).toEqual({
			allowedFrom: 'a@b.c',
			defaultSiteSlug: 'gmina-miedzna',
			fallbackAuthorId: FALLBACK,
			siteByEmail: {},
			siteByDomain: [],
		});
		expect(
			parseInboundDraftConfig({
				INBOUND_DEFAULT_SITE_SLUG: 'gmina-miedzna',
				INBOUND_FALLBACK_AUTHOR_ID: FALLBACK,
				INBOUND_SITE_BY_DOMAIN: 'sp-miedzna.pl:sp-miedzna',
				INBOUND_SITE_BY_EMAIL: 'a@b.c:sp-miedzna',
			}),
		).toMatchObject({
			siteByDomain: [{ domain: 'sp-miedzna.pl', slug: 'sp-miedzna' }],
			siteByEmail: { 'a@b.c': 'sp-miedzna' },
		});
	});

	it('odrzuca brak sluga albo zly UUID autora — panel bez tych env', () => {
		expect(parseInboundDraftConfig({})).toBeNull();
		expect(
			parseInboundDraftConfig({
				INBOUND_DEFAULT_SITE_SLUG: 'gmina-miedzna',
				INBOUND_FALLBACK_AUTHOR_ID: 'nie-uuid',
			}),
		).toBeNull();
		expect(
			parseInboundDraftConfig({
				INBOUND_DEFAULT_SITE_SLUG: '',
				INBOUND_FALLBACK_AUTHOR_ID: FALLBACK,
			}),
		).toBeNull();
	});
});
