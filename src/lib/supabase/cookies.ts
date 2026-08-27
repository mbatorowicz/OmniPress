import type { CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

function parseCookieHeader(header: string): { name: string; value: string }[] {
	if (!header) return [];
	return header
		.split(';')
		.map((part) => {
			const idx = part.indexOf('=');
			if (idx === -1) return null;
			const name = part.slice(0, idx).trim();
			let value = part.slice(idx + 1).trim();
			if (value.startsWith('"') && value.endsWith('"')) {
				value = value.slice(1, -1);
			}
			try {
				value = decodeURIComponent(value);
			} catch {
				/* surowa wartość */
			}
			return { name, value };
		})
		.filter((c): c is { name: string; value: string } => Boolean(c?.name));
}

function toAstroOptions(options: CookieOptions): CookieOptions {
	return {
		path: options.path ?? '/',
		sameSite: (options.sameSite as CookieOptions['sameSite']) ?? 'lax',
		secure: options.secure ?? import.meta.env.PROD,
		httpOnly: options.httpOnly ?? true,
		maxAge: options.maxAge,
		domain: options.domain,
		expires: options.expires,
	};
}

/**
 * Adapter zgodny z @supabase/ssr: getAll/setAll + merge ciasteczek ustawionych w tym samym żądaniu.
 */
export function createSupabaseCookieAdapter(cookies: AstroCookies, request: Request) {
	const pending = new Map<string, { value: string; options?: CookieOptions }>();

	return {
		getAll() {
			const merged = new Map<string, string>();
			for (const c of parseCookieHeader(request.headers.get('Cookie') ?? '')) {
				merged.set(c.name, c.value);
			}
			for (const [name, entry] of pending) {
				// Pusta wartość = kasowanie; bez delete getAll oddałoby token sprzed wylogowania.
				if (entry.value) merged.set(name, entry.value);
				else merged.delete(name);
			}
			return Array.from(merged, ([name, value]) => ({ name, value }));
		},
		setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
			for (const { name, value, options } of cookiesToSet) {
				const opts = toAstroOptions(options ?? {});
				pending.set(name, { value, options: opts });
				if (!value) {
					cookies.delete(name, opts);
				} else {
					cookies.set(name, value, opts);
				}
			}
		},
	};
}
