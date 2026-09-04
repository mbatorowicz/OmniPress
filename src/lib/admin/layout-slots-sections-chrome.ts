import {
	fa,
	panelCloseHtml,
	panelOpenHtml,
	slotPanelHeaderHtml,
} from './layout-slots-sections-panels';
import { slotFieldNames, type SectionBuildConfig } from './layout-slots-sections-types';

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
