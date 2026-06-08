type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function clientKey(request: Request, action: string): string {
	const forwarded = request.headers.get('x-forwarded-for');
	const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
	return `${action}:${ip}`;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/** Prosty limiter auth (per instancja serverless). */
export function checkAuthRateLimit(request: Request, action: string): RateLimitResult {
	const key = clientKey(request, action);
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return { allowed: true };
	}

	if (bucket.count >= MAX_ATTEMPTS) {
		const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
		return { allowed: false, retryAfterSec };
	}

	bucket.count += 1;
	return { allowed: true };
}

/** Tylko testy — czyści stan limitera. */
export function resetAuthRateLimitsForTests(): void {
	buckets.clear();
}
