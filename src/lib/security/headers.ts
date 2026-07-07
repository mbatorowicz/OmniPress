const SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export type SecurityHeaderOptions = {
	cspNonce?: string;
	supabaseUrl?: string;
};

function supabaseOrigins(supabaseUrl?: string): { https: string; wss: string } | null {
	if (!supabaseUrl) return null;
	try {
		const parsed = new URL(supabaseUrl);
		const https = parsed.origin;
		const wss = https.replace(/^https:/, 'wss:');
		return { https, wss };
	} catch {
		return null;
	}
}

function buildContentSecurityPolicy(options: SecurityHeaderOptions): string | null {
	const nonce = options.cspNonce?.trim();
	if (!nonce) return null;

	const supabase = supabaseOrigins(options.supabaseUrl);
	const imgSrc = ["'self'", 'data:', 'blob:'];
	const connectSrc = ["'self'"];
	if (supabase) {
		imgSrc.push(supabase.https);
		connectSrc.push(supabase.https, supabase.wss);
	}

	return [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'`,
		"style-src 'self' 'unsafe-inline'",
		imgSrc.join(' ').replace(/^/, 'img-src '),
		connectSrc.join(' ').replace(/^/, 'connect-src '),
		"worker-src 'self' blob:",
		"object-src 'none'",
		"base-uri 'self'",
		"frame-ancestors 'none'",
		"form-action 'self'",
	].join('; ');
}

/** Nagłówki bezpieczeństwa dla każdej odpowiedzi HTTP. */
export function applySecurityHeaders(
	response: Response,
	options: SecurityHeaderOptions = {},
): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(name, value);
	}
	if (import.meta.env.PROD) {
		headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	const csp = buildContentSecurityPolicy(options);
	if (csp) headers.set('Content-Security-Policy', csp);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
