/** Log błędu Groka bez treści maila (AUTH.md). */
export function logInboundAiFailed(error: unknown, model: string): void {
	const name = error instanceof Error ? error.name : 'unknown';
	const status =
		error && typeof error === 'object' && 'statusCode' in error
			? Number((error as { statusCode?: unknown }).statusCode)
			: NaN;
	console.warn(
		JSON.stringify({
			event: 'inbound_ai_failed',
			model,
			name,
			...(Number.isFinite(status) ? { status } : {}),
		}),
	);
}
