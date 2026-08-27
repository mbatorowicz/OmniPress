/** Nazwy pól formularza — SSOT: slot-form-fields.ts + components.ts */
import { slotFormAttr } from '@/lib/admin/layout-form-ids';
import { slotFormFields as slotFieldNames } from '@/lib/astro-layout/slot-form-fields';
import {
	getComponentKind,
	getComponentsAddableInZone,
	getComponentsOfKind,
	LAYOUT_COMPONENT_KINDS,
	type LayoutComponentKind,
	type LayoutZone,
} from '@/lib/astro-layout/components';

export { slotFieldNames };

export type { LayoutComponentKind, LayoutZone };

export function componentToKind(component: string): LayoutComponentKind | null {
	return getComponentKind(component);
}

export interface SectionFieldLabels {
	widgetTitle: string;
	widgetSectionTitle: string;
	widgetLimit: string;
	widgetEmptyText: string;
	widgetHideWhenEmpty: string;
	widgetMoreLink: string;
	widgetTileHeight: string;
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
	weatherTerytGmina: string;
	weatherLat: string;
	weatherLon: string;
	weatherMapZoom: string;
	weatherMapScope: string;
	weatherShowMap: string;
	weatherDetailsDisplay: string;
	weatherDetailsLayout: string;
	weatherDetailsSummary: string;
	weatherDetailsCloseLabel: string;
	topbarText: string;
	topbarAccessibilityTools: string;
	siteMetaName: string;
	siteMetaDescription: string;
	siteMetaUrl: string;
	headerBrandLogoUrl: string;
	headerBrandLogoAlt: string;
	headerBrandHomeHref: string;
}

export interface FooterFieldLabels {
	contactHeading: string;
	contactHint: string;
	addressLine1: string;
	addressLine2: string;
	phones: string;
	email: string;
	nip: string;
	regon: string;
	epuap: string;
	eDoreczenia: string;
	bankHeading: string;
	bankAccounts: string;
	bankAccountsHint: string;
	officeHoursHeading: string;
	officeHours: string;
	officeHoursHint: string;
	invoiceHeading: string;
	invoiceBuyer: string;
	invoiceRecipient: string;
	invoiceTitle: string;
	invoiceName: string;
	invoiceAddress: string;
	invoiceNip: string;
	legalHeading: string;
	legalLinks: string;
	legalLinksHint: string;
	contactCtaLabel: string;
	contactCtaHref: string;
	copyrightSuffix: string;
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
	footerFieldLabels: FooterFieldLabels;
	categoryOptionsHtml: string;
	pageOptionsHtml: string;
	certOptionsHtml: string;
	componentLabels: Record<string, string>;
	slotPanelSectionTitleLabel: string;
	homeFeedCategoriesLabel: string;
	homeFeedCategoriesHint: string;
	homeFeedPinnedHint: string;
	homeFeedTileHeightHint: string;
	homeFeedCategoryCheckboxesHtml: string;
	formId?: string;
}

/** Atrybut `form=` dla pól renderowanych poza znacznikiem formularza (dialogi slotów). */
function fa(config: { formId?: string }): string {
	return slotFormAttr(config.formId);
}

function panelOpenHtml(id: string, component: string): string {
	return `<div id="slot-panel-${id}" class="ui-fieldset-nested slot-config-panel slot-detail-block" data-slot-id="${id}" data-component="${component}">`;
}

function panelCloseHtml(): string {
	return '</div>';
}

function slotPanelHeaderHtml(id: string, label: string, component: string, config: SectionBuildConfig): string {
	const componentLabel = config.componentLabels[component] ?? component;
	const safeLabel = label || id;
	return `
		<header class="slot-panel-header sm:col-span-2">
			<p class="ui-subheading">${componentLabel}</p>
			<p class="ui-hint">${config.slotPanelSectionTitleLabel}: ${safeLabel}</p>
			<p class="ui-caption font-mono">${id}</p>
		</header>`;
}

function buildHomeFeedCategoriesHtml(id: string, component: string, config: SectionBuildConfig): string {
	const checkboxes = config.homeFeedCategoryCheckboxesHtml.replaceAll('__SLOTID__', id);
	const pinnedHint =
		component === 'home.pinned'
			? `<p class="ui-hint">${config.homeFeedPinnedHint}</p>`
			: '';
	return `
		<fieldset class="home-feed-categories-field sm:col-span-2">
			<legend class="font-medium">${config.homeFeedCategoriesLabel}</legend>
			<p class="ui-hint">${config.homeFeedCategoriesHint}</p>
			${pinnedHint}
			<div class="mt-2 flex flex-col gap-1">${checkboxes}</div>
		</fieldset>`;
}

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

export function buildFooterDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const f = slotFieldNames.footer;
	const l = config.footerFieldLabels;
	return `
		${panelOpenHtml(id, component)}
			${slotPanelHeaderHtml(id, label, component, config)}
			<input type="hidden"${fa(config)} name="${f.detail(id)}" value="1" />
			<p class="ui-subheading sm:col-span-2">${l.contactHeading}</p>
			<p class="ui-hint sm:col-span-2">${l.contactHint}</p>
			<label class="ui-label-inline"><span class="font-medium">${l.addressLine1}</span><input${fa(config)} name="${f.addressLine1(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.addressLine2}</span><input${fa(config)} name="${f.addressLine2(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.phones}</span><textarea${fa(config)} name="${f.phones(id)}" rows="2" class="ui-input-compact w-full"></textarea></label>
			<label class="ui-label-inline"><span class="font-medium">${l.email}</span><input${fa(config)} name="${f.email(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.epuap}</span><input${fa(config)} name="${f.epuap(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.nip}</span><input${fa(config)} name="${f.nip(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.regon}</span><input${fa(config)} name="${f.regon(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.eDoreczenia}</span><input${fa(config)} name="${f.eDoreczenia(id)}" class="ui-input-compact w-full" /></label>
			<p class="ui-subheading sm:col-span-2">${l.bankHeading}</p>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.bankAccounts}</span><textarea${fa(config)} name="${f.bankAccounts(id)}" rows="3" class="ui-input-compact ui-input-compact--mono w-full"></textarea></label>
			<p class="ui-hint sm:col-span-2">${l.bankAccountsHint}</p>
			<p class="ui-subheading sm:col-span-2">${l.officeHoursHeading}</p>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.officeHours}</span><textarea${fa(config)} name="${f.officeHours(id)}" rows="2" class="ui-input-compact w-full"></textarea></label>
			<p class="ui-hint sm:col-span-2">${l.officeHoursHint}</p>
			<p class="ui-subheading sm:col-span-2">${l.invoiceHeading}</p>
			<p class="font-medium sm:col-span-2">${l.invoiceBuyer}</p>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceTitle}</span><input${fa(config)} name="${f.invoiceBuyerTitle(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceName}</span><input${fa(config)} name="${f.invoiceBuyerName(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceAddress}</span><textarea${fa(config)} name="${f.invoiceBuyerAddress(id)}" rows="2" class="ui-input-compact w-full"></textarea></label>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceNip}</span><input${fa(config)} name="${f.invoiceBuyerNip(id)}" class="ui-input-compact w-full" /></label>
			<p class="font-medium sm:col-span-2">${l.invoiceRecipient}</p>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceTitle}</span><input${fa(config)} name="${f.invoiceRecipientTitle(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceName}</span><input${fa(config)} name="${f.invoiceRecipientName(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceAddress}</span><textarea${fa(config)} name="${f.invoiceRecipientAddress(id)}" rows="2" class="ui-input-compact w-full"></textarea></label>
			<label class="ui-label-inline"><span class="font-medium">${l.invoiceNip}</span><input${fa(config)} name="${f.invoiceRecipientNip(id)}" class="ui-input-compact w-full" /></label>
			<p class="ui-subheading sm:col-span-2">${l.legalHeading}</p>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.legalLinks}</span><textarea${fa(config)} name="${f.legalLinks(id)}" rows="2" class="ui-input-compact ui-input-compact--mono w-full"></textarea></label>
			<p class="ui-hint sm:col-span-2">${l.legalLinksHint}</p>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.contactCtaLabel}</span><input${fa(config)} name="${f.contactCtaLabel(id)}" class="ui-input-compact w-full" /></label>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.contactCtaHref}</span><input${fa(config)} name="${f.contactCtaHref(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.copyrightSuffix}</span><input${fa(config)} name="${f.copyrightSuffix(id)}" class="ui-input-compact w-full" /></label>
		${panelCloseHtml()}`;
}

export function buildChromeDetailHtml(
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	const l = config.fieldLabels;
	if (component === 'topbar.tagline') {
		const f = slotFieldNames.topbar;
		return `
			${panelOpenHtml(id, component)}
				${slotPanelHeaderHtml(id, label, component, config)}
				<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.topbarText}</span><input${fa(config)} name="${f.text(id)}" class="ui-input-compact w-full" /></label>
				<label class="ui-label-inline sm:col-span-2 flex items-center gap-2"><input type="checkbox"${fa(config)} name="${f.accessibilityTools(id)}" class="ui-checkbox" checked /><span class="font-medium">${l.topbarAccessibilityTools}</span></label>
			${panelCloseHtml()}`;
	}
	if (component === 'site.meta') {
		const f = slotFieldNames.siteMeta;
		return `
			${panelOpenHtml(id, component)}
				${slotPanelHeaderHtml(id, label, component, config)}
				<label class="ui-label-inline"><span class="font-medium">${l.siteMetaName}</span><input${fa(config)} name="${f.name(id)}" class="ui-input-compact w-full" /></label>
				<label class="ui-label-inline sm:col-span-2"><span class="font-medium">${l.siteMetaDescription}</span><input${fa(config)} name="${f.description(id)}" class="ui-input-compact w-full" /></label>
				<label class="ui-label-inline"><span class="font-medium">${l.siteMetaUrl}</span><input${fa(config)} name="${f.url(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			${panelCloseHtml()}`;
	}
	if (component === 'header.brand') {
		const f = slotFieldNames.headerBrand;
		return `
			${panelOpenHtml(id, component)}
				${slotPanelHeaderHtml(id, label, component, config)}
				<label class="ui-label-inline"><span class="font-medium">${l.headerBrandLogoUrl}</span><input${fa(config)} name="${f.logoUrl(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
				<label class="ui-label-inline"><span class="font-medium">${l.headerBrandLogoAlt}</span><input${fa(config)} name="${f.logoAlt(id)}" class="ui-input-compact w-full" /></label>
				<label class="ui-label-inline"><span class="font-medium">${l.headerBrandHomeHref}</span><input${fa(config)} name="${f.homeHref(id)}" class="ui-input-compact ui-input-compact--mono w-full" /></label>
			${panelCloseHtml()}`;
	}
	if (component === 'footer.main') {
		return buildFooterDetailHtml(id, label, component, config);
	}
	return panelOpenHtml(id, component) + panelCloseHtml();
}

export function buildDetailHtml(
	kind: LayoutComponentKind,
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	switch (kind) {
		case 'home_feed':
			return buildHomeFeedDetailHtml(id, label, component, config);
		case 'local_feed':
			return buildLocalFeedDetailHtml(id, label, component, config);
		case 'live_feed':
			return buildLiveFeedDetailHtml(id, label, component, config);
		case 'banner':
			return buildBannerDetailHtml(id, label, component, config);
		case 'chrome':
			return buildChromeDetailHtml(id, label, component, config);
		case 'navigation':
			return panelOpenHtml(id, component) + slotPanelHeaderHtml(id, label, component, config) + panelCloseHtml();
	}
}

export function editableZoneComponents(zone: LayoutZone): string[] {
	return getComponentsAddableInZone(zone);
}

const KIND_LABELS: Record<LayoutComponentKind, string> = {
	chrome: 'Elementy strony',
	navigation: 'Nawigacja',
	home_feed: 'Feedy strony głównej',
	live_feed: 'Widgety na żywo',
	local_feed: 'Feedy lokalne',
	banner: 'Banery',
};

export function buildZoneComponentOptionsHtml(
	zone: LayoutZone,
	componentLabels: Record<string, string>,
	selectedComponent?: string,
): string {
	return getComponentsAddableInZone(zone)
		.map(
			(id) =>
				`<option value="${id}"${selectedComponent === id ? ' selected' : ''}>${componentLabels[id] ?? id}</option>`,
		)
		.join('');
}

export function buildComponentOptionsGroupedHtml(
	componentLabels: Record<string, string>,
	_zoneTitles: Record<LayoutZone, string>,
	options?: {
		filterZone?: LayoutZone;
		selectedComponent?: string;
	},
): string {
	if (options?.filterZone) {
		return buildZoneComponentOptionsHtml(
			options.filterZone,
			componentLabels,
			options.selectedComponent,
		);
	}

	return LAYOUT_COMPONENT_KINDS.map((kind) => {
		const ids = getComponentsOfKind(kind);
		if (ids.length === 0) return '';
		const optgroupLabel = KIND_LABELS[kind] ?? kind;
		const optionsHtml = ids
			.map(
				(id) =>
					`<option value="${id}"${options?.selectedComponent === id ? ' selected' : ''}>${componentLabels[id] ?? id}</option>`,
			)
			.join('');
		return `<optgroup label="${optgroupLabel}">${optionsHtml}</optgroup>`;
	}).join('');
}

export function buildSlotCardHtml(
	id: string,
	label: string,
	component: string,
	config: {
		componentLabels: Record<string, string>;
		settingsLabel: string;
		enabledLabel: string;
		enabled?: boolean;
		order?: number;
		summaryHtml?: string;
		zone?: string;
		zoneLabel?: string;
		zoneBadgePrefix?: string;
		formId?: string;
	},
): string {
	const componentLabel = config.componentLabels[component] ?? component;
	const safeLabel = label || id;
	const enabled = config.enabled !== false;
	const order = config.order ?? 0;
	const summary = config.summaryHtml ?? '';
	const zoneField =
		config.zone != null
			? `<input type="hidden" name="slot_zone_${id}" value="${config.zone}" class="slot-card-zone-input" />`
			: '';
	const zoneBadge =
		config.zoneLabel && config.zoneBadgePrefix
			? `<p class="layout-slot-card__zone ui-caption text-text-muted">${config.zoneBadgePrefix}: ${config.zoneLabel}</p>`
			: '';
	const dataZone = config.zone ? ` data-zone="${config.zone}"` : '';
	return `
		<article class="layout-slot-card" data-slot-id="${id}" data-component="${component}"${dataZone}>
			<input type="hidden" name="slot_id" value="${id}" />
			<input type="hidden" name="slot_label" value="${safeLabel}" class="slot-card-label-input" />
			<input type="hidden" name="slot_component" value="${component}" />
			${zoneField}
			<input type="hidden" name="slot_widget_order" value="${order}" class="slot-card-order-input" />
			<div class="layout-slot-card__main">
				<div>
					<p class="layout-slot-card__type">${componentLabel}</p>
					<p class="layout-slot-card__label">${safeLabel}</p>
					${zoneBadge}
					<div class="layout-slot-card__chips">${summary}</div>
				</div>
				<div class="layout-slot-card__actions">
					<label class="layout-slot-card__enabled flex items-center gap-1.5 text-sm">
						<input type="checkbox"${fa(config)} name="slot_enabled_${id}" ${enabled ? 'checked' : ''} class="slot-card-enabled" />
						<span>${config.enabledLabel}</span>
					</label>
					<button type="button" class="slot-settings-open ui-btn ui-btn--secondary ui-btn--compact" data-dialog-id="slot-dialog-${id}" onclick="var d=document.getElementById(this.dataset.dialogId);if(d&&typeof d.showModal==='function'){try{d.showModal()}catch(e){console.error('[OmniPress] showModal:',e)}}">${config.settingsLabel}</button>
				</div>
			</div>
		</article>`;
}

export function buildSlotDialogShellHtml(
	id: string,
	title: string,
	closeLabel: string,
	panelHtml: string,
): string {
	return `
		<dialog id="slot-dialog-${id}" class="slot-settings-dialog">
			<div class="slot-settings-dialog__panel">
				<header class="slot-settings-dialog__header">
					<h3 class="slot-settings-dialog__title">${title}</h3>
					<button type="button" class="slot-dialog-close ui-btn ui-btn--secondary ui-btn--compact" onclick="var d=this.closest('dialog');if(d&&typeof d.close==='function')d.close()">${closeLabel}</button>
				</header>
				<div class="slot-settings-dialog__body">${panelHtml}</div>
			</div>
		</dialog>`;
}
