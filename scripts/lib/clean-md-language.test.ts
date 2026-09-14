import { describe, expect, it } from 'vitest';
import {
	proofreadExcerpt,
	proofreadMarkdown,
	proofreadPlain,
	proofreadTitle,
} from './clean-md-language.mjs';

describe('proofreadPlain', () => {
	it('poprawia literówkę i pisownię urzędową', () => {
		expect(proofreadPlain('o rozporczęciu konsultacji')).toBe('o rozpoczęciu konsultacji');
		expect(proofreadPlain('środków WFOŚi GW i w/w ustawy')).toBe('środków WFOŚiGW i ww. ustawy');
		expect(proofreadPlain('audyty i/lub przeglądy')).toBe('audyty lub przeglądy');
		expect(proofreadPlain('moc 6.12kWp i 3.06k Wp')).toBe('moc 6,12 kWp i 3,06 kWp');
	});

	it('dokłada cudzysłów przy pn. i kapitalizuje tytuł zadania', () => {
		expect(
			proofreadPlain(
				'Informacja Wójta z realizacji zadania pn. Budowa i rozbudowa kanalizacji sanitarnej w miejscowości Miedzna ul. Ogrodowa.',
			),
		).toBe(
			'Informacja Wójta z realizacji zadania pn. „Budowa i rozbudowa kanalizacji sanitarnej w miejscowości Miedzna ul. Ogrodowa”.',
		);
		expect(
			proofreadPlain(
				'pn. „Budowa i rozbudowa kanalizacji sanitarnej w miejscowości Miedzna ul”. Ogrodowa',
			),
		).toContain('ul. Ogrodowa');
		expect(proofreadPlain('pn. „przebudowa odcinka drogi gminnej nr 420509w w obrębie wsi warchoły”')).toContain(
			'„Przebudowa odcinka drogi gminnej nr 420509W w obrębie wsi Warchoły”',
		);
	});

	it('składa urwany akapit o najmie lokalu', () => {
		const out = proofreadPlain(
			'na część nieruchomości niezamieszkałej (na której prowadzona jest wynajmowana, obowiązek zawarcia umowy na odbiór odpadów spoczywa na właścicielu lokalu, chyba ze zapisy umowy najmu lokalu stanowią inaczej.',
		);
		expect(out).toContain('działalność gospodarcza');
		expect(out).toContain('chyba że zapisy');
		expect(out).not.toContain('jest wynajmowana,');
	});

	it('uzupełnia urwaną ulicę i prostuje cytowanie ustawy', () => {
		expect(proofreadPlain('plac szkolny w Miedznie, przy ul……')).toBe(
			'plac szkolny w Miedznie, przy ul. Kościelnej 15',
		);
		expect(
			proofreadPlain('ustawy z dnia 24 kwietnia 2003 roku ustawy o działalności pożytku publicznego'),
		).toContain('2003 r. o działalności');
	});
});

describe('proofreadTitle', () => {
	it('prostuje przypadek, tytuł konkursu i wykrzyknik z emotikoną', () => {
		expect(proofreadTitle('Ogłoszenie wójta gminy Miedzna')).toBe('Ogłoszenie Wójta Gminy Miedzna');
		expect(proofreadTitle('VIII Ogólnopolskiego Konkursu Filmowego dla Młodzieży')).toBe(
			'VIII Ogólnopolski Konkurs Filmowy dla Młodzieży',
		);
		expect(proofreadTitle('Nabór w gminie Miedzna! zapraszamy ;)')).toBe('Nabór w gminie Miedzna!');
	});
});

describe('proofreadExcerpt', () => {
	it('zastępuje zajawkę ze slugiem tytułem', () => {
		expect(proofreadExcerpt('Plan-ogolny-gminy-–-informacje-szczegolowe', 'Plan ogólny gminy')).toBe(
			'Plan ogólny gminy',
		);
	});
});

describe('proofreadMarkdown', () => {
	it('nie psuje bloku PDF i poprawia etykietę', () => {
		const md =
			'<div class="op-pdf-viewer" data-op-pdf-src="./a.pdf" data-op-pdf-title="WFOŚi GW"></div>\n\nTekst w/w ustawy.';
		const out = proofreadMarkdown(md);
		expect(out).toContain('class="op-pdf-viewer"');
		expect(out).toContain('data-op-pdf-title="WFOŚiGW"');
		expect(out).toContain('ww. ustawy');
	});
});
