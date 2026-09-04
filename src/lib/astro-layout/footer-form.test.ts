import { describe, expect, it } from 'vitest';
import { mergeLayoutFromFormData } from './parse-form';
import { slotFormFields } from './slot-form-fields';
import { migrateFlatSlotsToZones } from './zones';
import { emptySiteAstroLayout } from './types';
import type { DisplaySlot, SiteAstroLayout } from './types';

const FOOTER_ID = 'footer_main';

function footerSlot(widget?: DisplaySlot['widget']): DisplaySlot {
	return { id: FOOTER_ID, label: 'Stopka', component: 'footer.main', widget };
}

function baseLayout(widget?: DisplaySlot['widget']): SiteAstroLayout {
	const slots: DisplaySlot[] = [
		{ id: 'header_navigation', label: 'Menu główne', component: 'header.navigation' },
		footerSlot(widget),
	];
	return {
		...emptySiteAstroLayout(),
		categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		zones: migrateFlatSlotsToZones(slots),
		slots,
	};
}

function footerForm(): FormData {
	const f = slotFormFields.footer;
	const form = new FormData();
	form.set('section', 'components');
	form.set('layout_zone', 'footer');
	form.append('slot_id', FOOTER_ID);
	form.append('slot_label', 'Stopka');
	form.append('slot_component', 'footer.main');
	form.set(`slot_enabled_${FOOTER_ID}`, 'on');
	form.set(f.detail(FOOTER_ID), '1');
	return form;
}

function parsedFooterWidget(form: FormData, existing = baseLayout()) {
	const result = mergeLayoutFromFormData(form, existing, 'components');
	expect(result.ok).toBe(true);
	if (!result.ok) throw new Error('merge failed');
	const slot = result.layout.zones.footer.components.find((s) => s.component === 'footer.main');
	expect(slot).toBeDefined();
	return slot!.widget ?? {};
}

describe('parseFooterWidget — pełny edytor stopki', () => {
	it('parsuje dane kontaktowe, konta, godziny, faktury i linki prawne', () => {
		const f = slotFormFields.footer;
		const form = footerForm();
		form.set(f.addressLine1(FOOTER_ID), 'ul. 11 Listopada 4');
		form.set(f.addressLine2(FOOTER_ID), '07-106 Miedzna');
		form.set(f.phones(FOOTER_ID), '(0-25) 691-83-27\n(0-25) 691-83-28');
		form.set(f.email(FOOTER_ID), 'sekretariat@gmina-miedzna.pl');
		form.set(f.nip(FOOTER_ID), '824-126-13-73');
		form.set(f.regon(FOOTER_ID), '000544556');
		form.set(f.epuap(FOOTER_ID), '366ap2kaiu');
		form.set(f.eDoreczenia(FOOTER_ID), 'AE:PL-20566-32159-EIVFC-16');
		form.set(
			f.bankAccounts(FOOTER_ID),
			'Rachunek główny | 41 9221 0000 0039 1111 2000 0020\nOpłaty za odbiór odpadów | 63 9221 0000 0039 1111 2000 0100',
		);
		form.set(f.officeHours(FOOTER_ID), 'Pracujemy od 7.30 do 15.30');
		form.set(f.invoiceBuyerTitle(FOOTER_ID), 'Nabywca');
		form.set(f.invoiceBuyerName(FOOTER_ID), 'Gmina Miedzna');
		form.set(f.invoiceBuyerAddress(FOOTER_ID), 'ul. 11 Listopada 4\n07-106 Miedzna');
		form.set(f.invoiceBuyerNip(FOOTER_ID), '824-172-35-14');
		form.set(f.invoiceRecipientTitle(FOOTER_ID), 'Odbiorca');
		form.set(f.invoiceRecipientName(FOOTER_ID), 'Urząd Gminy w Miedznie');
		form.set(f.invoiceRecipientNip(FOOTER_ID), '824-126-13-73');
		form.set(
			f.legalLinks(FOOTER_ID),
			'Deklaracja dostępności | /gmina/deklaracja-dostepnosci\nKlauzula informacyjna | /gmina/klauzula-rodo',
		);
		form.set(f.contactCtaLabel(FOOTER_ID), 'Przejdź do kontaktu i mapy dojazdu');
		form.set(f.contactCtaHref(FOOTER_ID), '/kontakt');
		form.set(f.copyrightSuffix(FOOTER_ID), 'Wszelkie prawa zastrzeżone.');

		const widget = parsedFooterWidget(form);

		expect(widget.contact).toEqual({
			addressLine1: 'ul. 11 Listopada 4',
			addressLine2: '07-106 Miedzna',
			phones: ['(0-25) 691-83-27', '(0-25) 691-83-28'],
			email: 'sekretariat@gmina-miedzna.pl',
			nip: '824-126-13-73',
			regon: '000544556',
			epuap: '366ap2kaiu',
			eDoreczenia: 'AE:PL-20566-32159-EIVFC-16',
		});
		expect(widget.bankAccounts).toEqual([
			{ name: 'Rachunek główny', number: '41 9221 0000 0039 1111 2000 0020' },
			{ name: 'Opłaty za odbiór odpadów', number: '63 9221 0000 0039 1111 2000 0100' },
		]);
		expect(widget.officeHours).toEqual([{ day: 'Pracujemy od 7.30 do 15.30' }]);
		expect(widget.invoiceData?.buyer?.nip).toBe('824-172-35-14');
		expect(widget.invoiceData?.recipient?.name).toBe('Urząd Gminy w Miedznie');
		expect(widget.legalLinks).toEqual([
			{ label: 'Deklaracja dostępności', href: '/gmina/deklaracja-dostepnosci' },
			{ label: 'Klauzula informacyjna', href: '/gmina/klauzula-rodo' },
		]);
		expect(widget.contactCtaHref).toBe('/kontakt');
		expect(widget.copyrightSuffix).toBe('Wszelkie prawa zastrzeżone.');
	});

	it('godziny w formacie „opis | godziny” rozbija na day + hours', () => {
		const f = slotFormFields.footer;
		const form = footerForm();
		form.set(f.officeHours(FOOTER_ID), 'Poniedziałek–Piątek | 7.30–15.30');
		const widget = parsedFooterWidget(form);
		expect(widget.officeHours).toEqual([{ day: 'Poniedziałek–Piątek', hours: '7.30–15.30' }]);
	});

	it('pomija niekompletne linki prawne (bez adresu)', () => {
		const f = slotFormFields.footer;
		const form = footerForm();
		form.set(f.legalLinks(FOOTER_ID), 'Sam tekst bez linku\nMapa strony | /mapa');
		const widget = parsedFooterWidget(form);
		expect(widget.legalLinks).toEqual([{ label: 'Mapa strony', href: '/mapa' }]);
	});

	it('czyści listę, gdy pole jest puste (pełny formularz obecny)', () => {
		const existing = baseLayout({
			bankAccounts: [{ name: 'Stare', number: '00 0000' }],
			legalLinks: [{ label: 'Stary', href: '/stary' }],
		});
		const form = footerForm();
		const widget = parsedFooterWidget(form, existing);
		expect(widget.bankAccounts).toEqual([]);
		expect(widget.legalLinks).toEqual([]);
	});

	it('bez znacznika detail nie nadpisuje istniejących danych stopki', () => {
		const existing = baseLayout({
			contact: { nip: '824-126-13-73' },
			bankAccounts: [{ name: 'Główny', number: '41 9221' }],
		});
		const f = slotFormFields.footer;
		const form = new FormData();
		form.set('section', 'components');
		form.set('layout_zone', 'footer');
		form.append('slot_id', FOOTER_ID);
		form.append('slot_label', 'Stopka');
		form.append('slot_component', 'footer.main');
		form.set(`slot_enabled_${FOOTER_ID}`, 'on');
		// brak znacznika detail i brak pól szczegółowych
		form.set(f.contactCtaLabel(FOOTER_ID), 'Nowe CTA');

		const widget = parsedFooterWidget(form, existing);
		expect(widget.contact?.nip).toBe('824-126-13-73');
		expect(widget.bankAccounts).toEqual([{ name: 'Główny', number: '41 9221' }]);
		expect(widget.contactCtaLabel).toBe('Nowe CTA');
	});
});
