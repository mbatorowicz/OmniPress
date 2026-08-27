import type { AstroCookies } from 'astro';
import type { CookieOptions } from '@supabase/ssr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseCookieAdapter } from './cookies';

type SetCall = { name: string; value: string; options: CookieOptions };
type DeleteCall = { name: string; options: CookieOptions };

let setCalls: SetCall[];
let deleteCalls: DeleteCall[];

function fakeCookies(): AstroCookies {
	return {
		set: vi.fn((name: string, value: string, options: CookieOptions) => {
			setCalls.push({ name, value, options });
		}),
		delete: vi.fn((name: string, options: CookieOptions) => {
			deleteCalls.push({ name, options });
		}),
	} as unknown as AstroCookies;
}

function adapter(cookieHeader?: string) {
	const request = new Request('https://panel.test/dashboard', {
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
	});
	return createSupabaseCookieAdapter(fakeCookies(), request);
}

beforeEach(() => {
	setCalls = [];
	deleteCalls = [];
});

describe('getAll — parsowanie nagłówka Cookie', () => {
	it('czyta pary nazwa=wartość rozdzielone średnikiem', () => {
		expect(adapter('sb-access-token=abc; sb-refresh-token=def').getAll()).toEqual([
			{ name: 'sb-access-token', value: 'abc' },
			{ name: 'sb-refresh-token', value: 'def' },
		]);
	});

	it('zwraca pustą listę bez nagłówka', () => {
		expect(adapter().getAll()).toEqual([]);
	});

	it('pomija fragmenty bez znaku równości', () => {
		expect(adapter('bezwartosci; sb-token=abc').getAll()).toEqual([
			{ name: 'sb-token', value: 'abc' },
		]);
	});

	it('zdejmuje cudzysłowy z wartości', () => {
		expect(adapter('sb-token="abc"').getAll()).toEqual([{ name: 'sb-token', value: 'abc' }]);
	});

	it('dekoduje percent-encoding (JSON sesji Supabase)', () => {
		expect(adapter('sb-token=%7B%22a%22%3A1%7D').getAll()).toEqual([
			{ name: 'sb-token', value: '{"a":1}' },
		]);
	});

	it('zostawia surową wartość gdy percent-encoding jest niepoprawny', () => {
		expect(adapter('sb-token=100%25%zz').getAll()).toEqual([
			{ name: 'sb-token', value: '100%25%zz' },
		]);
	});

	it('nie gubi wartości zawierających znak równości (base64)', () => {
		expect(adapter('sb-token=YWJj==').getAll()).toEqual([{ name: 'sb-token', value: 'YWJj==' }]);
	});
});

describe('getAll — scalanie z ciasteczkami tego samego żądania', () => {
	it('zwraca wartość ustawioną przez setAll zamiast tej z nagłówka', () => {
		const cookies = adapter('sb-token=stary');
		cookies.setAll([{ name: 'sb-token', value: 'nowy', options: {} }]);
		expect(cookies.getAll()).toEqual([{ name: 'sb-token', value: 'nowy' }]);
	});

	it('dokłada ciasteczko, którego nie było w żądaniu', () => {
		const cookies = adapter('inne=1');
		cookies.setAll([{ name: 'sb-token', value: 'nowy', options: {} }]);
		expect(cookies.getAll()).toContainEqual({ name: 'sb-token', value: 'nowy' });
	});

	it('usunięte ciasteczko znika z getAll (wylogowanie w tym samym żądaniu)', () => {
		const cookies = adapter('sb-token=stary');
		cookies.setAll([{ name: 'sb-token', value: '', options: {} }]);
		expect(cookies.getAll()).toEqual([]);
	});
});

describe('setAll — zapis do AstroCookies', () => {
	it('domyślne opcje: path /, sameSite lax, httpOnly', () => {
		adapter().setAll([{ name: 'sb-token', value: 'abc', options: {} }]);
		expect(setCalls).toHaveLength(1);
		expect(setCalls[0]!.options).toMatchObject({
			path: '/',
			sameSite: 'lax',
			httpOnly: true,
		});
	});

	it('secure wyłączone poza produkcją', () => {
		adapter().setAll([{ name: 'sb-token', value: 'abc', options: {} }]);
		expect(setCalls[0]!.options.secure).toBe(import.meta.env.PROD);
	});

	it('nie nadpisuje opcji podanych przez Supabase', () => {
		adapter().setAll([
			{
				name: 'sb-token',
				value: 'abc',
				options: { path: '/auth', sameSite: 'strict', httpOnly: false, maxAge: 60 },
			},
		]);
		expect(setCalls[0]!.options).toMatchObject({
			path: '/auth',
			sameSite: 'strict',
			httpOnly: false,
			maxAge: 60,
		});
	});

	it('pusta wartość kasuje ciasteczko zamiast je ustawiać', () => {
		adapter().setAll([{ name: 'sb-token', value: '', options: { path: '/' } }]);
		expect(setCalls).toHaveLength(0);
		expect(deleteCalls).toEqual([{ name: 'sb-token', options: expect.objectContaining({ path: '/' }) }]);
	});

	it('przyjmuje brak obiektu options', () => {
		adapter().setAll([
			{ name: 'sb-token', value: 'abc', options: undefined as unknown as CookieOptions },
		]);
		expect(setCalls[0]!.options.path).toBe('/');
	});
});
