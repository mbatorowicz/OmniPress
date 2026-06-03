import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { getSupabaseEnv } from './env';

type CookieStore = {
	get: (name: string) => { value: string } | undefined;
	set: (name: string, value: string, options?: CookieOptions) => void;
	delete: (name: string, options?: CookieOptions) => void;
};

function cookiesFromAstro(cookies: AstroCookies): CookieStore {
	return {
		get: (name) => {
			const value = cookies.get(name)?.value;
			return value ? { value } : undefined;
		},
		set: (name, value, options) => {
			cookies.set(name, value, options);
		},
		delete: (name, options) => {
			cookies.delete(name, options);
		},
	};
}

export function createSupabaseServerClient(cookies: AstroCookies) {
	const { url, anonKey } = getSupabaseEnv();

	return createServerClient(url, anonKey, {
		cookies: cookiesFromAstro(cookies),
	});
}
