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
import { applySecurityHeaders } from './lib/security/headers';

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, cookies, redirect, locals } = context;
	const pathname = url.pathname;
	const codeRedirect = authCodeRedirectTarget(url);
	if (codeRedirect) {
		return applySecurityHeaders(redirect(codeRedirect));
	}

	if (!isSupabaseConfigured()) {
		if (pathname === '/' || isPublicPath(pathname)) {
			return applySecurityHeaders(await next());
		}
		return applySecurityHeaders(redirect('/?setup=1'));
	}

	const supabase = createSupabaseServerClient(cookies, context.request);
	locals.supabase = supabase;

	const user = await getSessionUser(supabase);
	locals.user = user;
	locals.profile = user ? await getProfile(supabase, user.id) : null;

	if (user && (pathname === '/login' || pathname === '/auth/callback')) {
		return applySecurityHeaders(redirect(roleHomePath(locals.profile?.role ?? 'editor')));
	}

	if (!user && isProtectedPath(pathname)) {
		return applySecurityHeaders(redirect('/login'));
	}

	if (!user && pathname === '/' && !url.searchParams.get('code')) {
		return applySecurityHeaders(redirect('/login'));
	}

	if (!user && pathname === '/auth/reset-password') {
		return applySecurityHeaders(await next());
	}

	if (user && pathname === '/') {
		return applySecurityHeaders(redirect(roleHomePath(locals.profile?.role ?? 'editor')));
	}

	if (user && pathname.startsWith('/admin') && locals.profile?.role !== 'admin') {
		return applySecurityHeaders(redirect('/dashboard'));
	}

	return applySecurityHeaders(await next());
});
