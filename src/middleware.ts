import { defineMiddleware } from 'astro:middleware';
import { getProfile, getSessionUser, PUBLIC_PATHS, roleHomePath } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase/env';
import { createSupabaseServerClient } from './lib/supabase/server';

const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, cookies, redirect, locals } = context;
	const pathname = url.pathname;

	if (!isSupabaseConfigured()) {
		if (pathname === '/' || PUBLIC_PATHS.has(pathname)) {
			return next();
		}
		return redirect('/?setup=1');
	}

	const supabase = createSupabaseServerClient(cookies);
	locals.supabase = supabase;

	const user = await getSessionUser(supabase);
	locals.user = user;
	locals.profile = user ? await getProfile(supabase, user.id) : null;

	const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

	if (user && pathname === '/login') {
		const role = locals.profile?.role ?? 'editor';
		return redirect(roleHomePath(role));
	}

	if (!user && (isProtected || pathname === '/')) {
		return redirect('/login');
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
