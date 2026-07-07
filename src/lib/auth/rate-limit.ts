import { resolveRateLimitStore, resetMemoryRateLimitStoreForTests } from './rate-limit-store';

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function clientIp(request: Request): string {
	const realIp = request.headers.get('x-real-ip')?.trim();
	if (realIp) return realIp;

	const forwarded = request.headers.get('x-forwarded-for');
	return forwarded?.split(',')[0]?.trim() || 'unknown';
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
