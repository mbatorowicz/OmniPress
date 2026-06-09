import type { BannerLinkType, DisplaySlot, SlotWidgetConfig } from './types';

export function isBannerLinkType(raw: string): raw is BannerLinkType {
	return raw === 'category' || raw === 'page' || raw === 'external';
}

export function resolveBannerHref(
	slot: DisplaySlot,
): { href: string; external: boolean } | null {
	if (slot.component !== 'sidebar.banner') return null;
	const w = slot.widget;
	if (!w || w.enabled === false) return null;

	const linkType = w.linkType;
	if (!linkType || !isBannerLinkType(linkType)) return null;

	switch (linkType) {
		case 'category': {
			const slug = w.categorySlug?.trim();
			if (!slug) return null;
			return { href: `/${slug}/`, external: false };
		}
		case 'page': {
			const raw = w.pagePath?.trim();
			if (!raw) return null;
			return { href: raw.startsWith('/') ? raw : `/${raw}`, external: false };
		}
		case 'external': {
			const url = w.externalUrl?.trim();
			if (!url) return null;
			return { href: url, external: true };
		}
		default:
			return null;
	}
}

export function validateBannerWidget(widget: SlotWidgetConfig, label: string): boolean {
	const style = widget.style === 'text' ? 'text' : 'image';
	const linkType = widget.linkType;
	if (!linkType || !isBannerLinkType(linkType)) return false;
	if (!label.trim()) return false;

	if (style === 'image' && !widget.imageUrl?.trim()) return false;
	if (style === 'text' && !widget.textTitle?.trim()) return false;
	if (linkType === 'category' && !widget.categorySlug?.trim()) return false;
	if (linkType === 'page' && !widget.pagePath?.trim()) return false;
	if (linkType === 'external' && !widget.externalUrl?.trim()) return false;

	return true;
}
