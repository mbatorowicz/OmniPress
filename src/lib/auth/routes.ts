import type { UserRole } from '../types';

export const PROTECTED_PREFIXES = ['/dashboard', '/admin'] as const;

export const PUBLIC_PATHS = new Set([
	'/login',
	'/auth/callback',
	'/auth/reset-password',
	'/auth/recover',
]);

export const AUTH_API_PREFIX = '/api/auth/';
export const ADMIN_API_PREFIX = '/api/admin/';
export const PUBLIC_API_PREFIXES = ['/api/cert/', '/api/weather/'] as const;

export function isPublicPath(pathname: string): boolean {
	if (PUBLIC_PATHS.has(pathname)) return true;
	if (pathname.startsWith(AUTH_API_PREFIX)) return true;
	if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
	return false;
}

export function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isAdminApiPath(pathname: string): boolean {
	return pathname.startsWith(ADMIN_API_PREFIX);
}

export function roleHomePath(role: UserRole): string {
	return role === 'admin' ? '/admin' : '/dashboard';
}
