import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { getSupabaseEnv } from './env';

function parseCookieHeader(header: string): { name: string; value: string }[] {
	if (!header) return [];
	return header
		.split(';')
		.map((part) => {
			const idx = part.indexOf('=');
			if (idx === -1) return null;
			return {
				name: part.slice(0, idx).trim(),
				value: part.slice(idx + 1).trim(),
			};
		})
		.filter((c): c is { name: string; value: string } => Boolean(c?.name));
}

function toAstroCookieOptions(options: CookieOptions): CookieOptions {
	return {
		path: options.path ?? '/',
		sameSite: options.sameSite ?? 'lax',
		secure: options.secure ?? import.meta.env.PROD,
		httpOnly: options.httpOnly ?? true,
		maxAge: options.maxAge,
		domain: options.domain,
		expires: options.expires,
	};
}

/**
 * Klient Supabase SSR z getAll/setAll — wymagane do zapisu sesji po logowaniu.
 */
export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
	const { url, anonKey } = getSupabaseEnv();

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return parseCookieHeader(request.headers.get('Cookie') ?? '');
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					if (value === '' || value === undefined) {
						cookies.delete(name, toAstroCookieOptions(options ?? {}));
					} else {
						cookies.set(name, value, toAstroCookieOptions(options ?? {}));
					}
				}
			},
		},
	});
}
