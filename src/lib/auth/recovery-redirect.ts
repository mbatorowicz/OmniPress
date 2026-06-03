const AUTH_CODE_PATHS = new Set(['/', '/login', '/auth/callback']);

/** Czy żądanie z ?code= dotyczy resetu hasła (nie magic link / OAuth). */
export function isPasswordRecoveryRedirect(url: URL): boolean {
	const type = url.searchParams.get('type');
	if (type === 'recovery') return true;

	const { pathname } = url;
	if (pathname === '/auth/reset-password' || pathname === '/auth/recover') return true;
	if (pathname === '/login' && url.searchParams.get('mode') === 'reset') return true;

	return false;
}

/**
 * Przekierowanie PKCE z Supabase: recovery → ustaw hasło, pozostałe → callback.
 * Zwraca null, gdy middleware ma przepuścić żądanie (np. /auth/callback obsługuje sam).
 */
export function authCodeRedirectTarget(url: URL): string | null {
	const code = url.searchParams.get('code');
	if (!code || !AUTH_CODE_PATHS.has(url.pathname)) return null;

	if (url.pathname === '/auth/callback') return null;

	const q = `code=${encodeURIComponent(code)}`;
	if (isPasswordRecoveryRedirect(url)) {
		return `/auth/reset-password?${q}`;
	}
	return `/auth/callback?${q}`;
}
