/** Log wyniku Groka bez treści maila (AUTH.md). */
export function logInboundAiOk(model: string, intent: string, posts: number): void {
	console.info(JSON.stringify({ event: 'inbound_ai_ok', model, intent, posts }));
}

function gatewayReason(error: unknown): string | undefined {
	if (!(error instanceof Error)) return undefined;
	const text = error.message.replace(/\s+/g, ' ').trim();
	if (
		!/free tier|paid credits|upgrade|forbidden|file-input|unsupported|does not have access/i.test(
			text,
		)
	) {
		return undefined;
	}
	return text.slice(0, 180);
}

export function logInboundAiFailed(error: unknown, model: string): void {
	const name = error instanceof Error ? error.name : 'unknown';
	const status =
		error && typeof error === 'object' && 'statusCode' in error
			? Number((error as { statusCode?: unknown }).statusCode)
			: NaN;
	const reason = gatewayReason(error);
	console.warn(
		JSON.stringify({
			event: 'inbound_ai_failed',
			model,
			name,
			...(Number.isFinite(status) ? { status } : {}),
			...(reason ? { reason } : {}),
		}),
	);
}
