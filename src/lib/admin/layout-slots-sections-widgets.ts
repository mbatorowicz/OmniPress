import {
	buildHomeFeedCategoriesHtml,
	fa,
	panelCloseHtml,
	panelOpenHtml,
	slotPanelHeaderHtml,
} from './layout-slots-sections-panels';
import { slotFieldNames, type SectionBuildConfig } from './layout-slots-sections-types';

export function buildHomeFeedDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const f = slotFieldNames.homeFeed;
	const l = config.fieldLabels;
	return `
		${panelOpenHtml(id, component)}
			${slotPanelHeaderHtml(id, label, component, config)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input${fa(config)} name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetSectionTitle}</span><input${fa(config)} name="${f.sectionTitle(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetLimit}</span><input${fa(config)} name="${f.limit(id)}" type="number" min="1" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input${fa(config)} name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2"><input type="checkbox"${fa(config)} name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetMoreLink}</span><input${fa(config)} name="${f.moreLink(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTileHeight}</span><input${fa(config)} name="${f.tileHeight(id)}" type="number" min="200" max="600" step="1" placeholder="auto" class="ui-input-compact w-full" /></label>
			<p class="ui-hint sm:col-span-2">${config.homeFeedTileHeightHint}</p>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetVariant}</span><select${fa(config)} name="${f.variant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantDefault}</option><option value="alert">${config.variantAlert}</option></select></label>
			${buildHomeFeedCategoriesHtml(id, component, config)}
		${panelCloseHtml()}`;
}

export function buildLocalFeedDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const f = slotFieldNames.recentChanges;
	const l = config.fieldLabels;
	return `
		${panelOpenHtml(id, component)}
			${slotPanelHeaderHtml(id, label, component, config)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input${fa(config)} name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetLimit}</span><input${fa(config)} name="${f.limit(id)}" type="number" min="1" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input${fa(config)} name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2"><input type="checkbox"${fa(config)} name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetVariant}</span><select${fa(config)} name="${f.variant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantDefault}</option><option value="alert">${config.variantAlert}</option></select></label>
		${panelCloseHtml()}`;
}

export function buildCertDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const f = slotFieldNames.cert;
	const l = config.fieldLabels;
	return `
		${panelOpenHtml(id, component)}
			${slotPanelHeaderHtml(id, label, component, config)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input${fa(config)} name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetLimit}</span><input${fa(config)} name="${f.limit(id)}" type="number" min="1" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input${fa(config)} name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2"><input type="checkbox"${fa(config)} name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetVariant}</span><select${fa(config)} name="${f.variant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantDefault}</option><option value="alert">${config.variantAlert}</option></select></label>
			<label class="ui-label-inline"><span class="font-medium">${l.certAdvisoriesCategory}</span><select${fa(config)} name="${f.categoryFilter(id)}" class="ui-select-compact w-full">${config.certOptionsHtml}</select></label>
		${panelCloseHtml()}`;
}

export function buildBannerDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const f = slotFieldNames.banner;
	const l = config.fieldLabels;
	return `
		${panelOpenHtml(id, component)}
			${slotPanelHeaderHtml(id, label, component, config)}
			<label class="ui-label-inline"><span class="font-medium">${l.bannerStyle}</span><select${fa(config)} name="${f.style(id)}" class="slot-banner-style ui-select-compact w-full"><option value="image">${config.styleImage}</option><option value="text">${config.styleText}</option></select></label>
			<label class="ui-label-inline slot-banner-field-image"><span class="font-medium">${l.bannerImageUrl}</span><input${fa(config)} name="${f.imageUrl(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			<label class="ui-label-inline slot-banner-field-image"><span class="font-medium">${l.bannerImageVariant}</span><select${fa(config)} name="${f.imageVariant(id)}" class="ui-select-compact w-full"><option value="default">${config.variantBannerDefault}</option><option value="blue">${config.variantBannerBlue}</option></select></label>
			<label class="ui-label-inline slot-banner-field-text hidden"><span class="font-medium">${l.bannerTextTitle}</span><input${fa(config)} name="${f.textTitle(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline slot-banner-field-text hidden"><span class="font-medium">${l.bannerTextButton}</span><input${fa(config)} name="${f.textButton(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.bannerLinkType}</span><select${fa(config)} name="${f.linkType(id)}" class="slot-banner-link-type ui-select-compact w-full"><option value="category">${config.linkCategory}</option><option value="page">${config.linkPage}</option><option value="external">${config.linkExternal}</option></select></label>
			<label class="ui-label-inline slot-banner-field-category"><span class="font-medium">${l.bannerCategory}</span><select${fa(config)} name="${f.categorySlug(id)}" class="ui-select-compact w-full">${config.categoryOptionsHtml}</select></label>
			<label class="ui-label-inline slot-banner-field-page hidden"><span class="font-medium">${l.bannerPage}</span><select${fa(config)} name="${f.pagePath(id)}" class="ui-select-compact w-full">${config.pageOptionsHtml}</select></label>
			<label class="ui-label-inline slot-banner-field-external hidden"><span class="font-medium">${l.bannerExternalUrl}</span><input${fa(config)} name="${f.externalUrl(id)}" class="ui-input-compact ui-input-compact--mono w-full" placeholder="https://" /></label>
		${panelCloseHtml()}`;
}

export function buildWeatherDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const f = slotFieldNames.weather;
	const l = config.fieldLabels;
	return `
		${panelOpenHtml(id, component)}
			${slotPanelHeaderHtml(id, label, component, config)}
			<label class="ui-label-inline"><span class="font-medium">${l.widgetTitle}</span><input${fa(config)} name="${f.title(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.widgetEmptyText}</span><input${fa(config)} name="${f.emptyText(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2 sm:col-span-2"><input type="checkbox"${fa(config)} name="${slotFieldNames.hideWhenEmpty(id)}" /><span class="font-medium">${l.widgetHideWhenEmpty}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherTerytPowiat}</span><input${fa(config)} name="${f.terytPowiat(id)}" class="ui-input-compact font-mono w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherTerytGmina}</span><input${fa(config)} name="${f.terytGmina(id)}" class="ui-input-compact font-mono w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherMapZoom}</span><input${fa(config)} name="${f.mapZoom(id)}" type="number" min="1" max="18" value="11" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherLat}</span><input${fa(config)} name="${f.lat(id)}" type="number" step="any" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherLon}</span><input${fa(config)} name="${f.lon(id)}" type="number" step="any" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.weatherMapScope}</span><input${fa(config)} name="${f.mapScope(id)}" class="ui-input-compact font-mono w-full" /></label>
			<label class="ui-label-inline flex items-center gap-2 sm:col-span-2"><input type="checkbox"${fa(config)} name="${f.showMap(id)}" checked /><span>${l.weatherShowMap}</span></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsDisplay}</span><select${fa(config)} name="${f.detailsDisplay(id)}" class="ui-select-compact w-full"><option value="modal">${config.weatherDetailsDisplayModal}</option><option value="inline">${config.weatherDetailsDisplayInline}</option></select></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsLayout}</span><select${fa(config)} name="${f.detailsLayout(id)}" class="ui-select-compact w-full"><option value="stacked">${config.weatherDetailsLayoutStacked}</option><option value="grid">${config.weatherDetailsLayoutGrid}</option></select></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsSummary}</span><input${fa(config)} name="${f.detailsSummary(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.weatherDetailsCloseLabel}</span><input${fa(config)} name="${f.detailsCloseLabel(id)}" class="ui-input-compact w-full" /></label>
		${panelCloseHtml()}`;
}

export function buildLiveFeedDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	if (component === 'sidebar.cert_advisories') {
		return buildCertDetailHtml(id, label, component, config);
	}
	return buildWeatherDetailHtml(id, label, component, config);
}
