import { describe, expect, it } from 'vitest';
import { stripQuotes } from './strip-quotes';

const PLAIN_WITH_QUOTE = [
	'Zapraszamy na sesję Rady.',
	'',
	'On Fri, Sep 18, 2026 at 9:00 PM Jan Kowalski <jan@example.com> wrote:',
	'> Poprzednia wiadomość',
	'> z cytatem.',
].join('\n');

const PLAIN_POLISH = [
	'Nowy komunikat dla mieszkańców.',
	'',
	'Dnia 18.09.2026 o 21:00 Jan Kowalski <jan@example.com> napisał:',
	'> Stara treść',
].join('\n');

const WITH_SIGNATURE = [
	'Treść ogłoszenia.',
	'',
	'-- ',
	'Jan Kowalski',
	'Urząd Gminy',
].join('\n');

describe('stripQuotes', () => {
	it('obcina angielski cytat On … wrote', () => {
		expect(stripQuotes(PLAIN_WITH_QUOTE)).toBe('Zapraszamy na sesję Rady.');
	});

	it('obcina polski cytat Dnia … napisał', () => {
		expect(stripQuotes(PLAIN_POLISH)).toBe('Nowy komunikat dla mieszkańców.');
	});

	it('obcina stopkę od linii -- ', () => {
		expect(stripQuotes(WITH_SIGNATURE)).toBe('Treść ogłoszenia.');
	});

	it('nie tnie treści bez cytatu ani markdownowego ---', () => {
		expect(stripQuotes('Dnia dzisiejszego wójt napisał list do sołtysów.')).toBe(
			'Dnia dzisiejszego wójt napisał list do sołtysów.',
		);
		expect(stripQuotes('Akapit.\n\n---\n\nDalej.')).toBe('Akapit.\n\n---\n\nDalej.');
	});
});
