import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { createSupabaseCookieAdapter } from './cookies';
import { getSupabaseEnv } from './env';

export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
	const { url, anonKey } = getSupabaseEnv();

	return createServerClient(url, anonKey, {
		cookies: createSupabaseCookieAdapter(cookies, request),
	});
}
