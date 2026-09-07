import { resolveRateLimitStore, resetMemoryRateLimitStoreForTests } from './rate-limit-store';

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

/**
 * Adres klienta do limitu prób. Na Vercel hop ustawia platforma
 * (`x-vercel-forwarded-for`, potem pierwszy hop `X-Forwarded-For`).
 * `x-real-ip` pomijamy — klient może go podłożyć, gdy front go nie nadpisze.
 */
export function clientIp(request: Request): string {
	const vercel = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
	if (vercel) return vercel;

	const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	if (forwarded) return forwarded;

	return 'unknown';
}

function clientKey(request: Request, action: string): string {
	return `${action}:${clientIp(request)}`;
}

/** Współdzielony limiter auth (Upstash Redis → Supabase RPC → pamięć w dev/test). */
export async function checkAuthRateLimit(
	request: Request,
	action: string,
): Promise<RateLimitResult> {
	const key = clientKey(request, action);
	return resolveRateLimitStore().increment(key, WINDOW_MS, MAX_ATTEMPTS);
}

/** Tylko testy — czyści stan limitera in-memory. */
export function resetAuthRateLimitsForTests(): void {
	resetMemoryRateLimitStoreForTests();
}

export { WINDOW_MS as AUTH_RATE_LIMIT_WINDOW_MS, MAX_ATTEMPTS as AUTH_RATE_LIMIT_MAX };
