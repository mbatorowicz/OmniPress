/** Backoff w minutach: 1 → 5 → 15 → 60 */
export const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60] as const;
export const MAX_PUBLISH_RETRIES = RETRY_BACKOFF_MINUTES.length;

export function computeNextRetryAt(retryCount: number, from = new Date()): Date | null {
	if (retryCount >= MAX_PUBLISH_RETRIES) return null;
	const minutes = RETRY_BACKOFF_MINUTES[retryCount] ?? 60;
	return new Date(from.getTime() + minutes * 60_000);
}

export function shouldRetry(retryCount: number): boolean {
	return retryCount < MAX_PUBLISH_RETRIES;
}
