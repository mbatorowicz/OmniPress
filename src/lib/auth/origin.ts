/** Odrzuca POST z nagłówkiem Origin wskazującym na inną domenę (CSRF). */
export function isCrossOriginPost(request: Request): boolean {
	const origin = request.headers.get('Origin');
	if (!origin) return false;

	const host = request.headers.get('Host');
	if (!host) return true;

	try {
		return new URL(origin).host !== host;
	} catch {
		return true;
	}
}
