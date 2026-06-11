/** Nazwy pól formularza — muszą być zsynchronizowane z slot-form-fields.ts */

function field(prefix: string, slotId: string): string {
	return `${prefix}__${slotId}`;
}

export const slotFieldNames = {
	hideWhenEmpty: (slotId: string) => `slot_hide_when_empty_${slotId}`,
	homeFeed: {
		title: (id: string) => field('slot_home_feed_title', id),
		sectionTitle: (id: string) => field('slot_home_feed_section_title', id),
		limit: (id: string) => field('slot_home_feed_limit', id),
		emptyText: (id: string) => field('slot_home_feed_empty_text', id),
		moreLink: (id: string) => field('slot_home_feed_more_link', id),
		variant: (id: string) => field('slot_home_feed_variant', id),
	},
	recentChanges: {
		title: (id: string) => field('slot_recent_title', id),
		limit: (id: string) => field('slot_recent_limit', id),
		emptyText: (id: string) => field('slot_recent_empty_text', id),
		variant: (id: string) => field('slot_recent_variant', id),
	},
	cert: {
		title: (id: string) => field('slot_cert_title', id),
		limit: (id: string) => field('slot_cert_limit', id),
		emptyText: (id: string) => field('slot_cert_empty_text', id),
		variant: (id: string) => field('slot_cert_variant', id),
		categoryFilter: (id: string) => field('slot_cert_category', id),
	},
	banner: {
		style: (id: string) => field('slot_banner_style', id),
		imageUrl: (id: string) => field('slot_banner_image_url', id),
		imageVariant: (id: string) => field('slot_banner_image_variant', id),
		textTitle: (id: string) => field('slot_banner_text_title', id),
		textButton: (id: string) => field('slot_banner_text_button', id),
		linkType: (id: string) => field('slot_banner_link_type', id),
		categorySlug: (id: string) => field('slot_banner_category_slug', id),
		pagePath: (id: string) => field('slot_banner_page_path', id),
		externalUrl: (id: string) => field('slot_banner_external_url', id),
	},
	weather: {
		title: (id: string) => field('slot_weather_title', id),
		emptyText: (id: string) => field('slot_weather_empty_text', id),
		terytPowiat: (id: string) => field('slot_weather_teryt_powiat', id),
		lat: (id: string) => field('slot_weather_lat', id),
		lon: (id: string) => field('slot_weather_lon', id),
		mapZoom: (id: string) => field('slot_weather_map_zoom', id),
		mapScope: (id: string) => field('slot_weather_map_scope', id),
		showMap: (id: string) => `slot_weather_show_map_${id}`,
		detailsDisplay: (id: string) => field('slot_weather_details_display', id),
		detailsLayout: (id: string) => field('slot_weather_details_layout', id),
		detailsSummary: (id: string) => field('slot_weather_details_summary', id),
		detailsCloseLabel: (id: string) => field('slot_weather_details_close_label', id),
	},
} as const;

export type LayoutComponentKind = 'home_feed' | 'recent_changes' | 'cert' | 'weather' | 'banner';

const COMPONENT_KIND: Record<string, LayoutComponentKind> = {
	'home.pinned': 'home_feed',
	'home.latest': 'home_feed',
	'sidebar.recent_changes': 'recent_changes',
	'sidebar.cert_advisories': 'cert',
	'sidebar.weather': 'weather',
	'sidebar.banner': 'banner',
};

export function componentToKind(component: string): LayoutComponentKind | null {
	return COMPONENT_KIND[component] ?? null;
}

export interface SectionFieldLabels {
	widgetTitle: string;
	widgetSectionTitle: string;
	widgetLimit: string;
	widgetEmptyText: string;
	widgetHideWhenEmpty: string;
	widgetMoreLink: string;
	widgetVariant: string;
	certAdvisoriesCategory: string;
	bannerStyle: string;
	bannerImageUrl: string;
	bannerImageVariant: string;
	bannerTextTitle: string;
	bannerTextButton: string;
	bannerLinkType: string;
	bannerCategory: string;
	bannerPage: string;
	bannerExternalUrl: string;
	weatherTerytPowiat: string;
	weatherLat: string;
	weatherLon: string;
	weatherMapZoom: string;
	weatherMapScope: string;
	weatherShowMap: string;
	weatherDetailsDisplay: string;
	weatherDetailsLayout: string;
	weatherDetailsSummary: string;
	weatherDetailsCloseLabel: string;
}

export interface SectionBuildConfig {
	variantDefault: string;
	variantAlert: string;
	styleImage: string;
	styleText: string;
	variantBannerDefault: string;
	variantBannerBlue: string;
	linkCategory: string;
	linkPage: string;
	linkExternal: string;
	certAllLabel: string;
	weatherDetailsDisplayModal: string;
	weatherDetailsDisplayInline: string;
	weatherDetailsLayoutStacked: string;
	weatherDetailsLayoutGrid: string;
	fieldLabels: SectionFieldLabels;
	categoryOptionsHtml: string;
	pageOptionsHtml: string;
	certOptionsHtml: string;
}

function slotHeaderHtml(label: string, id: string): string {
	const safeLabel = label || id;
	return `<p class="ui-label-text text-xs font-medium sm:col-span-2">${safeLabel} · <code class="ui-code">${id}</code></p>`;
}

export function buildHomeFeedDetailHtml(id: string, label: string, config: SectionBuildConfig): string {
	const f = slotFieldNames.homeFeed;
	const l = config.fieldLabels;
	return `
		<div class="ui-fieldset-nested slot-detail-block" data-slot-id="${id}">
			${slotHeaderHtml(label, id)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetSectionTitle}</span><input name="${f.sectionTitle(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetLimit}</span><input name="${f.limit(id)}" type="number" min="1" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2"><input type="checkbox" name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetMoreLink}</span><input name="${f.moreLink(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetVariant}</span><select name="${f.variant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantDefault}</option><option value="alert">${config.variantAlert}</option></select></label>
		</div>`;
}

export function buildRecentDetailHtml(id: string, label: string, config: SectionBuildConfig): string {
	const f = slotFieldNames.recentChanges;
	const l = config.fieldLabels;
	return `
		<div class="ui-fieldset-nested slot-detail-block" data-slot-id="${id}">
			${slotHeaderHtml(label, id)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetLimit}</span><input name="${f.limit(id)}" type="number" min="1" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2"><input type="checkbox" name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetVariant}</span><select name="${f.variant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantDefault}</option><option value="alert">${config.variantAlert}</option></select></label>
		</div>`;
}

export function buildCertDetailHtml(id: string, label: string, config: SectionBuildConfig): string {
	const f = slotFieldNames.cert;
	const l = config.fieldLabels;
	return `
		<div class="ui-fieldset-nested slot-detail-block" data-slot-id="${id}">
			${slotHeaderHtml(label, id)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetLimit}</span><input name="${f.limit(id)}" type="number" min="1" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2"><input type="checkbox" name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetVariant}</span><select name="${f.variant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantDefault}</option><option value="alert">${config.variantAlert}</option></select></label>
			<label class="ui-label-inline"><span class="font-medium">${l.certAdvisoriesCategory}</span><select name="${f.categoryFilter(id)}" class="ui-select-compact w-full">${config.certOptionsHtml}</select></label>
		</div>`;
}

export function buildBannerDetailHtml(id: string, label: string, config: SectionBuildConfig): string {
	const f = slotFieldNames.banner;
	const l = config.fieldLabels;
	return `
		<div class="ui-fieldset-nested slot-detail-block" data-slot-id="${id}">
			${slotHeaderHtml(label, id)}
			<label class="ui-label-inline"><span class="font-medium">${l.bannerStyle}</span><select name="${f.style(id)}" class="slot-banner-style ui-select-compact w-full"><option value="image">${config.styleImage}</option><option value="text">${config.styleText}</option></select></label>
			<label class="ui-label-inline slot-banner-field-image"><span class="font-medium">${l.bannerImageUrl}</span><input name="${f.imageUrl(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			<label class="ui-label-inline slot-banner-field-image"><span class="font-medium">${l.bannerImageVariant}</span><select name="${f.imageVariant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantBannerDefault}</option><option value="blue">${config.variantBannerBlue}</option></select></label>
			<label class="ui-label-inline slot-banner-field-text hidden"><span class="font-medium">${l.bannerTextTitle}</span><input name="${f.textTitle(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline slot-banner-field-text hidden"><span class="font-medium">${l.bannerTextButton}</span><input name="${f.textButton(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.bannerLinkType}</span><select name="${f.linkType(id)}" class="slot-banner-link-type ui-select-compact w-full"><option value="category">${config.linkCategory}</option><option value="page">${config.linkPage}</option><option value="external">${config.linkExternal}</option></select></label>
			<label class="ui-label-inline slot-banner-field-category"><span class="font-medium">${l.bannerCategory}</span><select name="${f.categorySlug(id)}" class="ui-select-compact w-full">${config.categoryOptionsHtml}</select></label>
			<label class="ui-label-inline slot-banner-field-page hidden"><span class="font-medium">${l.bannerPage}</span><select name="${f.pagePath(id)}" class="ui-select-compact w-full">${config.pageOptionsHtml}</select></label>
			<label class="ui-label-inline slot-banner-field-external hidden"><span class="font-medium">${l.bannerExternalUrl}</span><input name="${f.externalUrl(id)}" class="ui-input-compact ui-input-compact--mono w-full" placeholder="https://" /></label>
		</div>`;
}

export function buildWeatherDetailHtml(id: string, label: string, config: SectionBuildConfig): string {
	const f = slotFieldNames.weather;
	const l = config.fieldLabels;
	return `
		<div class="ui-fieldset-nested slot-detail-block" data-slot-id="${id}">
			${slotHeaderHtml(label, id)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2 sm:col-span-2"><input type="checkbox" name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherTerytPowiat}</span><input name="${f.terytPowiat(id)}" class="ui-input-compact font-mono w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherMapZoom}</span><input name="${f.mapZoom(id)}" type="number" min="1" max="18" value="11" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherLat}</span><input name="${f.lat(id)}" type="number" step="any" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherLon}</span><input name="${f.lon(id)}" type="number" step="any" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.weatherMapScope}</span><input name="${f.mapScope(id)}" class="ui-input-compact font-mono w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2 sm:col-span-2"><input type="checkbox" name="${f.showMap(id)}" checked /><span>${l.weatherShowMap}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsDisplay}</span><select name="${f.detailsDisplay(id)}" class="ui-select-compact w-full"><option value="modal">${config.weatherDetailsDisplayModal}</option><option value="inline">${config.weatherDetailsDisplayInline}</option></select></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsLayout}</span><select name="${f.detailsLayout(id)}" class="ui-select-compact w-full"><option value="stacked">${config.weatherDetailsLayoutStacked}</option><option value="grid">${config.weatherDetailsLayoutGrid}</option></select></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsSummary}</span><input name="${f.detailsSummary(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsCloseLabel}</span><input name="${f.detailsCloseLabel(id)}" class="ui-input-compact w-full" /></label>
		</div>`;
}

export function buildDetailHtml(
	kind: LayoutComponentKind,
	id: string,
	label: string,
	config: SectionBuildConfig,
): string {
	switch (kind) {
		case 'home_feed':
			return buildHomeFeedDetailHtml(id, label, config);
		case 'recent_changes':
			return buildRecentDetailHtml(id, label, config);
		case 'cert':
			return buildCertDetailHtml(id, label, config);
		case 'banner':
			return buildBannerDetailHtml(id, label, config);
		case 'weather':
			return buildWeatherDetailHtml(id, label, config);
	}
}
