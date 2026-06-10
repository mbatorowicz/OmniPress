const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200): Response {
	return jsonResponse({ ok: true, ...data }, status);
}

export function jsonError(error: string, status = 400): Response {
	return jsonResponse({ ok: false, error }, status);
}
