/** Pola widgetów per rodzaj komponentu — feedy, chrome, banery, pogoda, CERT. */
import { readHomeTileHeight } from './home-feed';
import { slotFormFields } from './slot-form-fields';
import { parseIntField, strField } from './parse-form-fields';
import { parseFooterWidget } from './parse-form-footer';
import type { SlotWidgetConfig } from './types';

function parseFeedListFields(
	form: FormData,
	id: string,
	fields: {
		title: (id: string) => string;
		limit: (id: string) => string;
		emptyText: (id: string) => string;
		variant: (id: string) => string;
	},
	widget: SlotWidgetConfig,
): void {
	const title = strField(form, fields.title(id));
	if (title) widget.title = title;
	const limit = parseIntField(form.get(fields.limit(id)));
	if (limit) widget.limit = limit;
	const emptyText = strField(form, fields.emptyText(id));
	if (emptyText) widget.emptyText = emptyText;
	if (form.get(slotFormFields.hideWhenEmpty(id)) === 'on') widget.hideWhenEmpty = true;
	const variant = strField(form, fields.variant(id));
	if (variant === 'alert' || variant === 'default') widget.variant = variant;
}

export function parseHomeFeedWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.homeFeed, widget);
	const sectionTitle = strField(form, slotFormFields.homeFeed.sectionTitle(id));
	if (sectionTitle) widget.sectionTitle = sectionTitle;
	const moreLink = strField(form, slotFormFields.homeFeed.moreLink(id));
	if (moreLink) widget.moreLink = moreLink;
	const tileHeight = readHomeTileHeight(strField(form, slotFormFields.homeFeed.tileHeight(id)));
	if (tileHeight !== undefined) widget.tileHeight = tileHeight;
}

export function parseLocalFeedWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.recentChanges, widget);
}

export function parseChromeWidget(
	form: FormData,
	id: string,
	component: string,
	widget: SlotWidgetConfig,
): void {
	if (component === 'topbar.tagline') {
		const text = strField(form, slotFormFields.topbar.text(id));
		if (text) widget.text = text;
		if (form.get(slotFormFields.topbar.accessibilityTools(id)) !== 'on') {
			widget.accessibilityTools = false;
		}
	}
	if (component === 'site.meta') {
		const name = strField(form, slotFormFields.siteMeta.name(id));
		const description = strField(form, slotFormFields.siteMeta.description(id));
		const url = strField(form, slotFormFields.siteMeta.url(id));
		if (name) widget.name = name;
		if (description) widget.description = description;
		if (url) widget.url = url;
	}
	if (component === 'header.brand') {
		const logoUrl = strField(form, slotFormFields.headerBrand.logoUrl(id));
		const logoAlt = strField(form, slotFormFields.headerBrand.logoAlt(id));
		const homeHref = strField(form, slotFormFields.headerBrand.homeHref(id));
		if (logoUrl) widget.logoUrl = logoUrl;
		if (logoAlt) widget.logoAlt = logoAlt;
		if (homeHref) widget.homeHref = homeHref;
	}
	if (component === 'footer.main') parseFooterWidget(form, id, widget);
}

function parseCertWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.cert, widget);
	const categoryFilter = strField(form, slotFormFields.cert.categoryFilter(id));
	if (categoryFilter) widget.categoryFilter = categoryFilter;
}

function parseWeatherWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	const title = strField(form, slotFormFields.weather.title(id));
	if (title) widget.title = title;
	const emptyText = strField(form, slotFormFields.weather.emptyText(id));
	if (emptyText) widget.emptyText = emptyText;
	if (form.get(slotFormFields.hideWhenEmpty(id)) === 'on') widget.hideWhenEmpty = true;
	const terytPowiat = strField(form, slotFormFields.weather.terytPowiat(id));
	if (terytPowiat) widget.terytPowiat = terytPowiat;
	const terytGmina = strField(form, slotFormFields.weather.terytGmina(id));
	if (terytGmina) widget.terytGmina = terytGmina;
	const lat = Number(strField(form, slotFormFields.weather.lat(id)));
	const lon = Number(strField(form, slotFormFields.weather.lon(id)));
	if (Number.isFinite(lat) && Number.isFinite(lon)) widget.mapCenter = { lat, lon };
	const zoom = Number(strField(form, slotFormFields.weather.mapZoom(id)));
	if (Number.isFinite(zoom) && zoom > 0) widget.mapZoom = Math.floor(zoom);
	if (form.get(slotFormFields.weather.showMap(id)) !== 'on') widget.showMap = false;
	const mapScope = strField(form, slotFormFields.weather.mapScope(id));
	if (mapScope) {
		widget.mapScopePowiaty = mapScope
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);
	}
	const detailsDisplay = strField(form, slotFormFields.weather.detailsDisplay(id));
	if (detailsDisplay === 'modal' || detailsDisplay === 'inline') widget.detailsDisplay = detailsDisplay;
	const detailsLayout = strField(form, slotFormFields.weather.detailsLayout(id));
	if (detailsLayout === 'stacked' || detailsLayout === 'grid') widget.detailsLayout = detailsLayout;
	const detailsSummary = strField(form, slotFormFields.weather.detailsSummary(id));
	if (detailsSummary) widget.detailsSummary = detailsSummary;
	const detailsCloseLabel = strField(form, slotFormFields.weather.detailsCloseLabel(id));
	if (detailsCloseLabel) widget.detailsCloseLabel = detailsCloseLabel;
}

export function parseLiveFeedWidget(
	form: FormData,
	id: string,
	component: string,
	widget: SlotWidgetConfig,
): void {
	if (component === 'sidebar.cert_advisories') parseCertWidget(form, id, widget);
	else if (component === 'sidebar.weather') parseWeatherWidget(form, id, widget);
}

export function parseBannerWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	widget.style = strField(form, slotFormFields.banner.style(id)) === 'text' ? 'text' : 'image';
	const imageUrl = strField(form, slotFormFields.banner.imageUrl(id));
	if (imageUrl) widget.imageUrl = imageUrl;
	if (strField(form, slotFormFields.banner.imageVariant(id)) === 'blue') widget.imageVariant = 'blue';
	const textTitle = strField(form, slotFormFields.banner.textTitle(id));
	if (textTitle) widget.textTitle = textTitle;
	const textButton = strField(form, slotFormFields.banner.textButton(id));
	if (textButton) widget.textButton = textButton;
	const linkType = strField(form, slotFormFields.banner.linkType(id));
	if (linkType === 'category' || linkType === 'page' || linkType === 'external') {
		widget.linkType = linkType;
	}
	if (widget.linkType === 'category') {
		const categorySlug = strField(form, slotFormFields.banner.categorySlug(id));
		if (categorySlug) widget.categorySlug = categorySlug;
	}
	if (widget.linkType === 'page') {
		const pagePath = strField(form, slotFormFields.banner.pagePath(id));
		if (pagePath) widget.pagePath = pagePath;
	}
	if (widget.linkType === 'external') {
		const externalUrl = strField(form, slotFormFields.banner.externalUrl(id));
		if (externalUrl) widget.externalUrl = externalUrl;
	}
}
