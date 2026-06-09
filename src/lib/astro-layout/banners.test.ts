import { describe, expect, it } from 'vitest';
import { isBannerLinkType, resolveBannerHref, validateBannerWidget } from './banners';
import type { DisplaySlot } from './types';

const bannerSlot = (widget: DisplaySlot['widget']): DisplaySlot => ({
	id: 'banner_1',
	label: 'Test baner',
	component: 'sidebar.banner',
	widget,
});

describe('resolveBannerHref', () => {
	it('buduje link do kategorii', () => {
		expect(
			resolveBannerHref(
				bannerSlot({
					style: 'image',
					imageUrl: 'https://x/img.png',
					linkType: 'category',
					categorySlug: 'pogoda',
				}),
			),
		).toEqual({ href: '/pogoda/', external: false });
	});

	it('buduje link do strony statycznej', () => {
		expect(
			resolveBannerHref(
				bannerSlot({
					style: 'text',
					textTitle: 'Kontakt',
					linkType: 'page',
					pagePath: '/kontakt',
				}),
			),
		).toEqual({ href: '/kontakt', external: false });
	});

	it('oznacza link zewnętrzny', () => {
		expect(
			resolveBannerHref(
				bannerSlot({
					style: 'image',
					imageUrl: 'https://x/img.png',
					linkType: 'external',
					externalUrl: 'https://example.com',
				}),
			),
		).toEqual({ href: 'https://example.com', external: true });
	});

	it('ignoruje slot innego typu', () => {
		expect(
			resolveBannerHref({
				id: 'w1',
				label: 'Pogoda',
				component: 'sidebar.weather',
				widget: { terytPowiat: '1465' },
			}),
		).toBeNull();
	});
});

describe('validateBannerWidget', () => {
	it('wymaga pól obrazka i linku zewnętrznego', () => {
		expect(
			validateBannerWidget(
				{ style: 'image', linkType: 'external', externalUrl: 'https://x.example' },
				'Alt',
			),
		).toBe(false);
		expect(
			validateBannerWidget(
				{
					style: 'image',
					imageUrl: 'https://x/y.png',
					linkType: 'external',
					externalUrl: 'https://x.example',
				},
				'Alt',
			),
		).toBe(true);
	});
});

describe('isBannerLinkType', () => {
	it('rozpoznaje typy linku', () => {
		expect(isBannerLinkType('category')).toBe(true);
		expect(isBannerLinkType('invalid')).toBe(false);
	});
});
