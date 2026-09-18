import { describe, expect, it } from 'vitest';
import { extractFromEmail, isAllowedFrom, parseAllowlist } from './allowlist';

const ALLOWED = ['redaktor@gmina.pl', 'Jan.Kowalski@Urzad.PL'];

describe('parseAllowlist', () => {
	it('składa dokładne adresy, małe litery, bez duplikatów', () => {
		expect(parseAllowlist('Redaktor@gmina.pl, jan.kowalski@urzad.pl\nredaktor@gmina.pl')).toEqual([
			'redaktor@gmina.pl',
			'jan.kowalski@urzad.pl',
		]);
	});

	it('pomija puste i nie-adresy', () => {
		expect(parseAllowlist('  , not-an-email, a@b.c ')).toEqual(['a@b.c']);
		expect(parseAllowlist(undefined)).toEqual([]);
	});
});

describe('extractFromEmail', () => {
	it('wyciąga adres z koperty From', () => {
		expect(extractFromEmail('redaktor@gmina.pl')).toBe('redaktor@gmina.pl');
		expect(extractFromEmail('Jan Kowalski <Jan.Kowalski@Urzad.PL>')).toBe('jan.kowalski@urzad.pl');
		expect(extractFromEmail('"Kowalski, Jan" <jan.kowalski@urzad.pl>')).toBe('jan.kowalski@urzad.pl');
	});

	it('odrzuca pusty i zniekształcony From', () => {
		expect(extractFromEmail('')).toBeNull();
		expect(extractFromEmail('Nie ma adresu')).toBeNull();
		expect(extractFromEmail('<nie-mail>')).toBeNull();
	});
});

describe('isAllowedFrom', () => {
	it('przepuszcza dokładny adres z listy (bez względu na wielkość liter)', () => {
		expect(isAllowedFrom('redaktor@gmina.pl', ALLOWED)).toBe(true);
		expect(isAllowedFrom('JAN.KOWALSKI@URZAD.PL', ALLOWED)).toBe(true);
		expect(isAllowedFrom('Jan <Redaktor@Gmina.PL>', ALLOWED)).toBe(true);
	});

	it('odrzuca obcego nadawcę i prawie-ten-sam adres', () => {
		expect(isAllowedFrom('obcy@example.com', ALLOWED)).toBe(false);
		expect(isAllowedFrom('redaktor+tag@gmina.pl', ALLOWED)).toBe(false);
		expect(isAllowedFrom('redaktor@gmina.pl.evil.test', ALLOWED)).toBe(false);
		expect(isAllowedFrom('redaktor@gmina.pl', [])).toBe(false);
		expect(isAllowedFrom('nie-mail', ALLOWED)).toBe(false);
	});
});
