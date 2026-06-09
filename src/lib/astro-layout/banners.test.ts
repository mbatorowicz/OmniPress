import { describe, expect, it } from 'vitest';
import { parseBanner, parseBanners, resolveBannerHref } from './banners';

describe('resolveBannerHref', () => {
	it('buduje link do kategorii', () => {
		expect(
			resolveBannerHref({
				id: 'b1',
				label: 'Test',
				style: 'image',
				imageUrl: 'https://x/img.png',
				linkType: 'category',
				categorySlug: 'pogoda',
			}),
		).toEqual({ href: '/pogoda/', external: false });
	});

	it('buduje link do strony statycznej', () => {
		expect(
			resolveBannerHref({
				id: 'b2',
				label: 'Test',
				style: 'text',
				textTitle: 'Kontakt',
				linkType: 'page',
				pagePath: '/kontakt',
			}),
		).toEqual({ href: '/kontakt', external: false });
	});

	it('oznacza link zewnętrzny', () => {
		expect(
			resolveBannerHref({
				id: 'b3',
				label: 'Test',
				style: 'image',
				imageUrl: 'https://x/img.png',
				linkType: 'external',
				externalUrl: 'https://example.com',
			}),
		).toEqual({ href: 'https://example.com', external: true });
	});
});

describe('parseBanner', () => {
	it('parsuje baner obrazkowy z kategorią', () => {
		const banner = parseBanner({
			id: 'banner_1',
			label: 'Ochrona',
			style: 'image',
			imageUrl: 'https://x/img.png',
			linkType: 'category',
			categorySlug: 'informacje',
			order: 40,
		});
		expect(banner?.linkType).toBe('category');
		expect(banner?.order).toBe(40);
	});
});

describe('parseBanners', () => {
	it('odrzuca baner bez wymaganego celu linku', () => {
		const banners = parseBanners([
			{
				id: 'bad',
				label: 'X',
				style: 'image',
				imageUrl: 'https://x/y.png',
				linkType: 'external',
			},
		]);
		expect(banners).toHaveLength(0);
	});
});
