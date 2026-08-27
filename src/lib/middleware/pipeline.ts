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
import { resolveAdminMfaRedirect } from '@/lib/auth/mfa';
import { jsonError } from '@/lib/api/response';
import { api } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { resolveSupabaseUrl } from '@/lib/supabase/resolve-env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { generateCspNonce } from '@/lib/security/nonce';

function withHeaders(response: Response, locals: App.Locals): Response {
	const supabaseUrl = isSupabaseConfigured() ? resolveSupabaseUrl() : undefined;
	return applySecurityHeaders(response, {
		cspNonce: locals.cspNonce,
		supabaseUrl: supabaseUrl ?? undefined,
	});
}

async function enforceAdminMfa(
	supabase: App.Locals['supabase'],
	pathname: string,
): Promise<string | null> {
	return resolveAdminMfaRedirect(supabase, pathname);
}

/** Pipeline middleware — fazy: PKCE → setup → sesja → MFA admin → trasy HTML → API admin. */
export const runMiddlewarePipeline: MiddlewareHandler = async (context, next) => {
	const { url, cookies, redirect, locals } = context;
	const pathname = url.pathname;

	locals.cspNonce = generateCspNonce();

	const codeRedirect = authCodeRedirectTarget(url);
	if (codeRedirect) {
		return withHeaders(redirect(codeRedirect), locals);
	}

	if (!isSupabaseConfigured()) {
		if (pathname === '/' || isPublicPath(pathname)) {
			return withHeaders(await next(), locals);
		}
		return withHeaders(redirect('/?setup=1'), locals);
	}

	const supabase = createSupabaseServerClient(cookies, context.request);
	locals.supabase = supabase;

	const user = await getSessionUser(supabase);
	locals.user = user;
	locals.profile = user ? await getProfile(supabase, user.id) : null;

	if (user && (pathname === '/login' || pathname === '/auth/callback')) {
		if (locals.profile?.role === 'admin') {
			const mfaRedirect = await enforceAdminMfa(supabase, pathname);
			if (mfaRedirect) return withHeaders(redirect(mfaRedirect), locals);
		}
		return withHeaders(redirect(roleHomePath(locals.profile?.role ?? 'editor')), locals);
	}

	if (!user && isProtectedPath(pathname)) {
		return withHeaders(redirect('/login'), locals);
	}

	if (!user && pathname === '/' && !url.searchParams.get('code')) {
		return withHeaders(redirect('/login'), locals);
	}

	if (!user && pathname === '/auth/reset-password') {
		return withHeaders(await next(), locals);
	}

	if (user && pathname === '/') {
		return withHeaders(redirect(roleHomePath(locals.profile?.role ?? 'editor')), locals);
	}

	if (user && pathname.startsWith('/admin') && locals.profile?.role !== 'admin') {
		return withHeaders(redirect('/dashboard'), locals);
	}

	// API admina odpowiada JSON-em niżej — przekierowanie HTML zwróciłoby stronę zamiast błędu.
	if (user && locals.profile?.role === 'admin' && !isAdminApiPath(pathname)) {
		const mfaRedirect = await enforceAdminMfa(supabase, pathname);
		if (mfaRedirect && pathname !== mfaRedirect) {
			return withHeaders(redirect(mfaRedirect), locals);
		}
	}

	if (isAdminApiPath(pathname)) {
		if (!user) {
			return withHeaders(jsonError(api.posts.unauthorized, 401), locals);
		}
		if (locals.profile?.role !== 'admin') {
			return withHeaders(jsonError(api.admin.forbidden, 403), locals);
		}
		if (await enforceAdminMfa(supabase, pathname)) {
			return withHeaders(jsonError(api.admin.mfaRequired, 403), locals);
		}
	}

	return withHeaders(await next(), locals);
};
