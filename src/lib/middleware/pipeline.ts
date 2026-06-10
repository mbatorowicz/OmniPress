import type { MiddlewareHandler } from 'astro';
import {
	authCodeRedirectTarget,
	getProfile,
	getSessionUser,
	isAdminApiPath,
	isProtectedPath,
	isPublicPath,
	roleHomePath,
} from '@/lib/auth';
import { jsonError } from '@/lib/api/response';
import { api } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { applySecurityHeaders } from '@/lib/security/headers';

async function withHeaders(response: Response): Promise<Response> {
	return applySecurityHeaders(response);
}

/** Pipeline middleware — fazy: PKCE → setup → sesja → trasy HTML → API admin. */
export const runMiddlewarePipeline: MiddlewareHandler = async (context, next) => {
	const { url, cookies, redirect, locals } = context;
	const pathname = url.pathname;

	const codeRedirect = authCodeRedirectTarget(url);
	if (codeRedirect) {
		return withHeaders(redirect(codeRedirect));
	}

	if (!isSupabaseConfigured()) {
		if (pathname === '/' || isPublicPath(pathname)) {
			return withHeaders(await next());
		}
		return withHeaders(redirect('/?setup=1'));
	}

	const supabase = createSupabaseServerClient(cookies, context.request);
	locals.supabase = supabase;

	const user = await getSessionUser(supabase);
	locals.user = user;
	locals.profile = user ? await getProfile(supabase, user.id) : null;

	if (user && (pathname === '/login' || pathname === '/auth/callback')) {
		return withHeaders(redirect(roleHomePath(locals.profile?.role ?? 'editor')));
	}

	if (!user && isProtectedPath(pathname)) {
		return withHeaders(redirect('/login'));
	}

	if (!user && pathname === '/' && !url.searchParams.get('code')) {
		return withHeaders(redirect('/login'));
	}

	if (!user && pathname === '/auth/reset-password') {
		return withHeaders(await next());
	}

	if (user && pathname === '/') {
		return withHeaders(redirect(roleHomePath(locals.profile?.role ?? 'editor')));
	}

	if (user && pathname.startsWith('/admin') && locals.profile?.role !== 'admin') {
		return withHeaders(redirect('/dashboard'));
	}

	if (isAdminApiPath(pathname)) {
		if (!user) {
			return withHeaders(jsonError(api.posts.unauthorized, 401));
		}
		if (locals.profile?.role !== 'admin') {
			return withHeaders(jsonError(api.admin.forbidden, 403));
		}
	}

	return withHeaders(await next());
};
