/** Nazwy pól formularza admina — sufiks `__{slotId}` wiąże wartość ze slotem. */

function field(prefix: string, slotId: string): string {
	return `${prefix}__${slotId}`;
}

export const slotFormFields = {
	hideWhenEmpty: (slotId: string) => `slot_hide_when_empty_${slotId}`,
	homeFeed: {
		title: (slotId: string) => field('slot_home_feed_title', slotId),
		sectionTitle: (slotId: string) => field('slot_home_feed_section_title', slotId),
		limit: (slotId: string) => field('slot_home_feed_limit', slotId),
		emptyText: (slotId: string) => field('slot_home_feed_empty_text', slotId),
		moreLink: (slotId: string) => field('slot_home_feed_more_link', slotId),
		variant: (slotId: string) => field('slot_home_feed_variant', slotId),
	},
	recentChanges: {
		title: (slotId: string) => field('slot_recent_title', slotId),
		limit: (slotId: string) => field('slot_recent_limit', slotId),
		emptyText: (slotId: string) => field('slot_recent_empty_text', slotId),
		variant: (slotId: string) => field('slot_recent_variant', slotId),
	},
	cert: {
		title: (slotId: string) => field('slot_cert_title', slotId),
		limit: (slotId: string) => field('slot_cert_limit', slotId),
		emptyText: (slotId: string) => field('slot_cert_empty_text', slotId),
		variant: (slotId: string) => field('slot_cert_variant', slotId),
		categoryFilter: (slotId: string) => field('slot_cert_category', slotId),
	},
	banner: {
		style: (slotId: string) => field('slot_banner_style', slotId),
		imageUrl: (slotId: string) => field('slot_banner_image_url', slotId),
		imageVariant: (slotId: string) => field('slot_banner_image_variant', slotId),
		textTitle: (slotId: string) => field('slot_banner_text_title', slotId),
		textButton: (slotId: string) => field('slot_banner_text_button', slotId),
		linkType: (slotId: string) => field('slot_banner_link_type', slotId),
		categorySlug: (slotId: string) => field('slot_banner_category_slug', slotId),
		pagePath: (slotId: string) => field('slot_banner_page_path', slotId),
		externalUrl: (slotId: string) => field('slot_banner_external_url', slotId),
	},
	weather: {
		title: (slotId: string) => field('slot_weather_title', slotId),
		emptyText: (slotId: string) => field('slot_weather_empty_text', slotId),
		terytPowiat: (slotId: string) => field('slot_weather_teryt_powiat', slotId),
		lat: (slotId: string) => field('slot_weather_lat', slotId),
		lon: (slotId: string) => field('slot_weather_lon', slotId),
		mapZoom: (slotId: string) => field('slot_weather_map_zoom', slotId),
		mapScope: (slotId: string) => field('slot_weather_map_scope', slotId),
		showMap: (slotId: string) => `slot_weather_show_map_${slotId}`,
		detailsDisplay: (slotId: string) => field('slot_weather_details_display', slotId),
		detailsLayout: (slotId: string) => field('slot_weather_details_layout', slotId),
		detailsSummary: (slotId: string) => field('slot_weather_details_summary', slotId),
		detailsCloseLabel: (slotId: string) => field('slot_weather_details_close_label', slotId),
	},
	topbar: {
		text: (slotId: string) => field('slot_topbar_text', slotId),
		accessibilityTools: (slotId: string) => field('slot_topbar_accessibility_tools', slotId),
	},
	siteMeta: {
		name: (slotId: string) => field('slot_site_meta_name', slotId),
		description: (slotId: string) => field('slot_site_meta_description', slotId),
		url: (slotId: string) => field('slot_site_meta_url', slotId),
	},
	headerBrand: {
		logoUrl: (slotId: string) => field('slot_header_brand_logo_url', slotId),
		logoAlt: (slotId: string) => field('slot_header_brand_logo_alt', slotId),
		homeHref: (slotId: string) => field('slot_header_brand_home_href', slotId),
	},
	footer: {
		contactCtaLabel: (slotId: string) => field('slot_footer_contact_cta_label', slotId),
		contactCtaHref: (slotId: string) => field('slot_footer_contact_cta_href', slotId),
		copyrightSuffix: (slotId: string) => field('slot_footer_copyright_suffix', slotId),
	},
} as const;
