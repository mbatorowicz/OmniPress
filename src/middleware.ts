import { defineMiddleware } from 'astro:middleware';
import {
	authCodeRedirectTarget,
	getProfile,
	getSessionUser,
	isProtectedPath,
	isPublicPath,
	roleHomePath,
} from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase/env';
import { createSupabaseServerClient } from './lib/supabase/server';

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, cookies, redirect, locals } = context;
	const pathname = url.pathname;
	const codeRedirect = authCodeRedirectTarget(url);
	if (codeRedirect) {
		return redirect(codeRedirect);
	}

	if (!isSupabaseConfigured()) {
		if (pathname === '/' || isPublicPath(pathname)) {
			return next();
		}
		return redirect('/?setup=1');
	}

	const supabase = createSupabaseServerClient(cookies, context.request);
	locals.supabase = supabase;

	const user = await getSessionUser(supabase);
	locals.user = user;
	locals.profile = user ? await getProfile(supabase, user.id) : null;

	if (user && (pathname === '/login' || pathname === '/auth/callback')) {
		return redirect(roleHomePath(locals.profile?.role ?? 'editor'));
	}

	if (!user && isProtectedPath(pathname)) {
		return redirect('/login');
	}

	if (!user && pathname === '/' && !url.searchParams.get('code')) {
		return redirect('/login');
	}

	if (!user && pathname === '/auth/reset-password') {
		return next();
	}

	if (user && pathname === '/') {
		return redirect(roleHomePath(locals.profile?.role ?? 'editor'));
	}

	if (user && pathname.startsWith('/admin') && locals.profile?.role !== 'admin') {
		return redirect('/dashboard');
	}

	return next();
});
