import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import type { RateLimitResult } from './rate-limit';

export type RateLimitStore = {
	increment(key: string, windowMs: number, maxAttempts: number): Promise<RateLimitResult>;
};

const WINDOW_SEC = (windowMs: number) => Math.max(1, Math.ceil(windowMs / 1000));

function parseUpstashEnv(): { url: string; token: string } | null {
	const url = import.meta.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url || !token) return null;
	return { url: url.replace(/\/$/, ''), token };
}

async function upstashIncrement(
	cfg: { url: string; token: string },
	key: string,
	windowMs: number,
	maxAttempts: number,
): Promise<RateLimitResult> {
	const ttlSec = WINDOW_SEC(windowMs);
	const redisKey = `auth_rl:${key}`;

	const pipelineRes = await fetch(`${cfg.url}/pipeline`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${cfg.token}` },
		body: JSON.stringify([
			['INCR', redisKey],
			['TTL', redisKey],
		]),
	});

	if (!pipelineRes.ok) {
		throw new Error(`upstash_pipeline_${pipelineRes.status}`);
	}

	const pipeline = (await pipelineRes.json()) as { result?: unknown };
	const results = pipeline.result as [number, number] | undefined;
	const count = results?.[0] ?? 1;
	let ttl = results?.[1] ?? -1;

	if (count === 1 || ttl < 0) {
		await fetch(`${cfg.url}/expire/${encodeURIComponent(redisKey)}/${ttlSec}`, {
			headers: { Authorization: `Bearer ${cfg.token}` },
		});
		ttl = ttlSec;
	}

	if (count > maxAttempts) {
		return { allowed: false, retryAfterSec: Math.max(1, ttl) };
	}

	return { allowed: true };
}

async function supabaseIncrement(
	key: string,
	windowMs: number,
	maxAttempts: number,
): Promise<RateLimitResult> {
	const supabase = createServiceSupabase();
	const { data, error } = await supabase.rpc('check_auth_rate_limit', {
		p_key: key,
		p_window_seconds: WINDOW_SEC(windowMs),
		p_max_attempts: maxAttempts,
	});

	if (error) throw new Error(error.message);

	const row = data as { allowed?: boolean; retry_after_sec?: number } | null;
	if (row?.allowed === false) {
		return {
			allowed: false,
			retryAfterSec: Math.max(1, row.retry_after_sec ?? WINDOW_SEC(windowMs)),
		};
	}

	return { allowed: true };
}

/** In-memory — tylko testy / dev bez Upstash i service role. */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryIncrement(
	key: string,
	windowMs: number,
	maxAttempts: number,
): RateLimitResult {
	const now = Date.now();
	const bucket = memoryBuckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true };
	}

	if (bucket.count >= maxAttempts) {
		return {
			allowed: false,
			retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
		};
	}

	bucket.count += 1;
	return { allowed: true };
}

let storeOverride: RateLimitStore | null = null;

export function setRateLimitStoreForTests(store: RateLimitStore | null): void {
	storeOverride = store;
}

export function resetMemoryRateLimitStoreForTests(): void {
	memoryBuckets.clear();
}

export function resolveRateLimitStore(): RateLimitStore {
	if (storeOverride) return storeOverride;

	const upstash = parseUpstashEnv();
	if (upstash) {
		return {
			increment: (key, windowMs, maxAttempts) =>
				upstashIncrement(upstash, key, windowMs, maxAttempts),
		};
	}

	if (isServiceSupabaseConfigured()) {
		return {
			increment: (key, windowMs, maxAttempts) =>
				supabaseIncrement(key, windowMs, maxAttempts),
		};
	}

	return {
		increment: async (key, windowMs, maxAttempts) =>
			memoryIncrement(key, windowMs, maxAttempts),
	};
}
