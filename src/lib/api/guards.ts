import { api } from '@/i18n';
import { requireAuth, type AuthSession } from '@/lib/auth/require';
import { jsonError } from '@/lib/api/response';
import type { GuardResult } from '@/lib/api/types';

type RedirectFn = (path: string) => Response;

function isResponse(value: GuardResult): value is Response {
	return value instanceof Response;
}

/** Guard sesji dla form POST — redirect na /login. */
export function guardAuthRedirect(locals: App.Locals, redirect: RedirectFn): GuardResult {
	const session = requireAuth(locals);
	if (!session) return redirect('/login');
	return session;
}

/** Guard admina dla form POST — redirect /login lub /dashboard (jak middleware HTML). */
export function guardAdminRedirect(locals: App.Locals, redirect: RedirectFn): GuardResult {
	const session = requireAuth(locals);
	if (!session) return redirect('/login');
	if (session.profile.role !== 'admin') return redirect('/dashboard');
	return session;
}

/** Guard sesji dla fetch API — JSON 401/403. */
export function guardAuthJson(locals: App.Locals): GuardResult {
	const session = requireAuth(locals);
	if (!session) return jsonError(api.posts.unauthorized, 401);
	return session;
}

/** Guard admina dla fetch API — JSON 401/403. */
export function guardAdminJson(locals: App.Locals): GuardResult {
	const session = requireAuth(locals);
	if (!session) return jsonError(api.posts.unauthorized, 401);
	if (session.profile.role !== 'admin') return jsonError(api.admin.forbidden, 403);
	return session;
}

export function isGuardBlocked(result: GuardResult): result is Response {
	return isResponse(result);
}

export type { AuthSession };
