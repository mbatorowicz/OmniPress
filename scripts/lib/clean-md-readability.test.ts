import { describe, expect, it } from 'vitest';
import {
	deriveTitleFromBody,
	fixOfficialSpelling,
	softenAllCapsRun,
} from './clean-md-readability.mjs';

describe('softenAllCapsRun', () => {
	it('zostawia zdanie z normalną kapitalizacją', () => {
		expect(softenAllCapsRun('Poradnik bezpieczeństwa')).toBe('Poradnik bezpieczeństwa');
	});

	it('zamienia krzykliwy tytuł, zostawiając akronim', () => {
		expect(softenAllCapsRun('ĆWICZENIE ALARM-26')).toBe('Ćwiczenie ALARM-26');
	});
});

describe('fixOfficialSpelling', () => {
	it('nie rusza „roku” i poprawia 2019r.', () => {
		expect(fixOfficialSpelling('w 2026 roku oraz 2019r. i 2021r Deklarację')).toBe(
			'w 2026 roku oraz 2019 r. i 2021 r. Deklarację',
		);
	});

	it('dopisuje cudzysłów programu MAZOWSZE', () => {
		expect(
			fixOfficialSpelling(
				'środków finansowych Mazowieckiego Instrumentu Aktywizacji Sołectw MAZOWSZE 2024” – „Mazowsze dla sołectw 2024”',
			),
		).toContain('„Mazowieckiego Instrumentu Aktywizacji Sołectw MAZOWSZE 2024”');
	});
});

describe('deriveTitleFromBody', () => {
	it('skraca zajawkę azbestu do tytułu bez wielokropka', () => {
		expect(
			deriveTitleFromBody(
				'Informacja',
				'Utylizację materiałów pokryciowych zawierających azbest – dofinansowano dzięki wsparciu Ministerstwa.',
			),
		).toBe('Utylizacja materiałów pokryciowych zawierających azbest');
	});

	it('bierze nazwę zadania z pn. gdy tytuł to Informacja', () => {
		expect(
			deriveTitleFromBody(
				'Informacja',
				'Gmina informuje, że zadanie pn. „Modernizacja Sali sportowej przy Szkole Podstawowej w Miedznie” współfinansowano.',
			),
		).toBe('Modernizacja Sali sportowej przy Szkole Podstawowej w Miedznie');
	});
});
