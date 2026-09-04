/** Nazwy pól formularza — SSOT: slot-form-fields.ts + components.ts */
import { slotFormFields as slotFieldNames } from '@/lib/astro-layout/slot-form-fields';
import {
	getComponentKind,
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
