import { defineMiddleware } from 'astro:middleware';
import {
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
	const authCode = url.searchParams.get('code');

	if (
		authCode &&
		(pathname === '/' || pathname === '/login' || pathname === '/auth/callback')
	) {
		return redirect(`/auth/reset-password?code=${encodeURIComponent(authCode)}`);
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

	if (!user && pathname === '/' && !authCode) {
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
