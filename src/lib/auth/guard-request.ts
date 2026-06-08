import { auth } from '@/i18n';
import { isCrossOriginPost } from './origin';
import { checkAuthRateLimit } from './rate-limit';

export type AuthRequestGuardResult =
	| { ok: true }
	| { ok: false; status: 403 | 429; message: string; retryAfterSec?: number };

/** Wspólna ochrona endpointów auth (CSRF przez Origin + rate limit). */
export function guardAuthMutationRequest(
	request: Request,
	action: string,
): AuthRequestGuardResult {
	if (isCrossOriginPost(request)) {
		return { ok: false, status: 403, message: auth.supabase.invalidCredentials };
	}

	const limit = checkAuthRateLimit(request, action);
	if (!limit.allowed) {
		return {
			ok: false,
			status: 429,
			message: auth.supabase.rateLimit,
			retryAfterSec: limit.retryAfterSec,
		};
	}

	return { ok: true };
}

/** Odrzuca cross-origin POST (np. wylogowanie CSRF). */
export function guardSameOriginPost(request: Request): AuthRequestGuardResult {
	if (isCrossOriginPost(request)) {
		return { ok: false, status: 403, message: auth.supabase.invalidCredentials };
	}
	return { ok: true };
}
