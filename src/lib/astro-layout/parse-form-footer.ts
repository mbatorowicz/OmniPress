/** Stopka strony — dane kontaktowe, konta bankowe, godziny pracy, dane do faktur, linki prawne. */
import { slotFormFields } from './slot-form-fields';
import { multilineValues, splitPipe, strField } from './parse-form-fields';
import type {
	FooterBankAccount,
	FooterContactBlock,
	FooterInvoiceParty,
	FooterLegalLink,
	FooterOfficeHours,
	SlotWidgetConfig,
} from './types';

function parseInvoiceParty(
	form: FormData,
	fields: { title: string; name: string; address: string; nip: string },
): FooterInvoiceParty | undefined {
	const party: FooterInvoiceParty = {};
	const title = strField(form, fields.title);
	const name = strField(form, fields.name);
	const address = strField(form, fields.address);
	const nip = strField(form, fields.nip);
	if (title) party.title = title;
	if (name) party.name = name;
	if (address) party.address = address;
	if (nip) party.nip = nip;
	return Object.keys(party).length > 0 ? party : undefined;
}

export function parseFooterWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	const f = slotFormFields.footer;

	const contactCtaLabel = strField(form, f.contactCtaLabel(id));
	const contactCtaHref = strField(form, f.contactCtaHref(id));
	const copyrightSuffix = strField(form, f.copyrightSuffix(id));
	if (contactCtaLabel) widget.contactCtaLabel = contactCtaLabel;
	if (contactCtaHref) widget.contactCtaHref = contactCtaHref;
	if (copyrightSuffix) widget.copyrightSuffix = copyrightSuffix;

	// Pola pełnego formularza parsujemy tylko, gdy formularz je zawiera — chroni dane
	// przed nadpisaniem przy zapisie z widoków, które renderują sam nagłówek slotu.
	if (!form.has(f.detail(id))) return;

	const contact: FooterContactBlock = {};
	const addressLine1 = strField(form, f.addressLine1(id));
	const addressLine2 = strField(form, f.addressLine2(id));
	const email = strField(form, f.email(id));
	const nip = strField(form, f.nip(id));
	const regon = strField(form, f.regon(id));
	const epuap = strField(form, f.epuap(id));
	const eDoreczenia = strField(form, f.eDoreczenia(id));
	const phones = multilineValues(form, f.phones(id));
	if (addressLine1) contact.addressLine1 = addressLine1;
	if (addressLine2) contact.addressLine2 = addressLine2;
	if (phones.length > 0) contact.phones = phones;
	if (email) contact.email = email;
	if (nip) contact.nip = nip;
	if (regon) contact.regon = regon;
	if (epuap) contact.epuap = epuap;
	if (eDoreczenia) contact.eDoreczenia = eDoreczenia;
	widget.contact = contact;

	widget.bankAccounts = multilineValues(form, f.bankAccounts(id))
		.map((line) => {
			const [name, number] = splitPipe(line);
			const account: FooterBankAccount = {};
			if (name) account.name = name;
			if (number) account.number = number;
			return account;
		})
		.filter((account) => account.name || account.number);

	widget.officeHours = multilineValues(form, f.officeHours(id))
		.map((line) => {
			const [day, hours] = splitPipe(line);
			const item: FooterOfficeHours = {};
			if (day) item.day = day;
			if (hours) item.hours = hours;
			return item;
		})
		.filter((item) => item.day || item.hours);

	const buyer = parseInvoiceParty(form, {
		title: f.invoiceBuyerTitle(id),
		name: f.invoiceBuyerName(id),
		address: f.invoiceBuyerAddress(id),
		nip: f.invoiceBuyerNip(id),
	});
	const recipient = parseInvoiceParty(form, {
		title: f.invoiceRecipientTitle(id),
		name: f.invoiceRecipientName(id),
		address: f.invoiceRecipientAddress(id),
		nip: f.invoiceRecipientNip(id),
	});
	const invoiceData: NonNullable<SlotWidgetConfig['invoiceData']> = {};
	if (buyer) invoiceData.buyer = buyer;
	if (recipient) invoiceData.recipient = recipient;
	widget.invoiceData = invoiceData;

	widget.legalLinks = multilineValues(form, f.legalLinks(id))
		.map((line) => splitPipe(line))
		.filter(([label, href]) => label && href)
		.map(([label, href]): FooterLegalLink => ({ label, href }));
}
