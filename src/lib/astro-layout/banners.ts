import type { SidebarBanner, SidebarBannerLinkType } from './types';

export function isBannerLinkType(raw: string): raw is SidebarBannerLinkType {
	return raw === 'category' || raw === 'page' || raw === 'external';
}

export function resolveBannerHref(
	banner: SidebarBanner,
): { href: string; external: boolean } | null {
	if (banner.enabled === false) return null;

	switch (banner.linkType) {
		case 'category': {
			const slug = banner.categorySlug?.trim();
			if (!slug) return null;
			return { href: `/${slug}/`, external: false };
		}
		case 'page': {
			const raw = banner.pagePath?.trim();
			if (!raw) return null;
			return { href: raw.startsWith('/') ? raw : `/${raw}`, external: false };
		}
		case 'external': {
			const url = banner.externalUrl?.trim();
			if (!url) return null;
			return { href: url, external: true };
		}
		default:
			return null;
	}
}

export function parseBanner(raw: unknown): SidebarBanner | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as SidebarBanner;
	if (typeof o.id !== 'string' || !o.id.trim()) return null;
	if (typeof o.label !== 'string' || !o.label.trim()) return null;
	if (!isBannerLinkType(o.linkType)) return null;

	const style = o.style === 'text' ? 'text' : 'image';
	const banner: SidebarBanner = {
		id: o.id.trim(),
		label: o.label.trim(),
		style,
		linkType: o.linkType,
	};

	if (typeof o.imageUrl === 'string' && o.imageUrl.trim()) banner.imageUrl = o.imageUrl.trim();
	if (o.imageVariant === 'blue') banner.imageVariant = 'blue';
	if (typeof o.textTitle === 'string' && o.textTitle.trim()) banner.textTitle = o.textTitle.trim();
	if (typeof o.textButton === 'string' && o.textButton.trim()) banner.textButton = o.textButton.trim();
	if (typeof o.categorySlug === 'string' && o.categorySlug.trim()) {
		banner.categorySlug = o.categorySlug.trim();
	}
	if (typeof o.pagePath === 'string' && o.pagePath.trim()) banner.pagePath = o.pagePath.trim();
	if (typeof o.externalUrl === 'string' && o.externalUrl.trim()) banner.externalUrl = o.externalUrl.trim();
	if (typeof o.order === 'number' && Number.isFinite(o.order) && o.order >= 0) {
		banner.order = Math.floor(o.order);
	}
	if (o.enabled === false) banner.enabled = false;

	if (style === 'image' && !banner.imageUrl) return null;
	if (style === 'text' && !banner.textTitle) return null;

	if (banner.linkType === 'category' && !banner.categorySlug) return null;
	if (banner.linkType === 'page' && !banner.pagePath) return null;
	if (banner.linkType === 'external' && !banner.externalUrl) return null;

	return banner;
}

export function parseBanners(raw: unknown): SidebarBanner[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(parseBanner).filter((b): b is SidebarBanner => b !== null);
}
