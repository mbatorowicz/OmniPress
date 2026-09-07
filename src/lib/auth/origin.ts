const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originHost(origin: string): string | null {
	try {
		return new URL(origin).host;
	} catch {
		return null;
	}
}

/**
 * POST/PUT/PATCH/DELETE z obcej domeny albo bez dowodu same-origin.
 * Brak `Origin` przepuszcza tylko `Sec-Fetch-Site: same-origin` (formularz
 * bez JS w nowszych przeglądarkach). Sam `x-real-ip` / brak nagłówków = odrzuć.
 */
export function isCrossOriginPost(request: Request): boolean {
	if (!MUTATING.has(request.method.toUpperCase())) return false;

	const origin = request.headers.get('Origin');
	if (origin) {
		const host = request.headers.get('Host');
		if (!host) return true;
		const parsed = originHost(origin);
		return parsed === null || parsed !== host;
	}

	return request.headers.get('Sec-Fetch-Site') !== 'same-origin';
}

export function isPanelMutationPath(pathname: string): boolean {
	return pathname.startsWith('/api/posts/') || pathname.startsWith('/api/admin/');
}
