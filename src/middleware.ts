import { defineMiddleware } from 'astro:middleware';
import { getProfile, getSessionUser, PUBLIC_PATHS, roleHomePath } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase/env';
import { createSupabaseServerClient } from './lib/supabase/server';

const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, cookies, redirect, locals } = context;
	const pathname = url.pathname;
	const authCode = url.searchParams.get('code');

	// Supabase recovery PKCE: często ląduje na Site URL (/) z ?code= — przekieruj na właściwą stronę
	if (
		authCode &&
		(pathname === '/' || pathname === '/login' || pathname === '/auth/callback')
	) {
		return redirect(`/auth/reset-password?code=${encodeURIComponent(authCode)}`);
	}

	if (!isSupabaseConfigured()) {
		if (pathname === '/' || PUBLIC_PATHS.has(pathname)) {
			return next();
		}
		return redirect('/?setup=1');
	}

	const supabase = createSupabaseServerClient(cookies, context.request);
	locals.supabase = supabase;

	const user = await getSessionUser(supabase);
	locals.user = user;
	locals.profile = user ? await getProfile(supabase, user.id) : null;

	const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

	if (user && (pathname === '/login' || pathname === '/auth/callback')) {
		const role = locals.profile?.role ?? 'editor';
		return redirect(roleHomePath(role));
	}

	if (!user && (isProtected || (pathname === '/' && !authCode))) {
		return redirect('/login');
	}

	if (!user && pathname === '/auth/reset-password') {
		return next();
	}

	if (user && pathname === '/') {
		const role = locals.profile?.role ?? 'editor';
		return redirect(roleHomePath(role));
	}

	if (user && pathname.startsWith('/admin') && locals.profile?.role !== 'admin') {
		return redirect('/dashboard');
	}

	return next();
});
