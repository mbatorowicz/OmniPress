const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lista z env: przecinki / nowe linie, małe litery, bez pustych. */
export function parseAllowlist(raw: string | null | undefined): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	for (const part of raw.split(/[,\n]/)) {
		const email = part.trim().toLowerCase();
		if (!email || !EMAIL_RE.test(email)) continue;
		seen.add(email);
	}
	return [...seen];
}

/** Adres z `From:` — `nazwa <a@b.c>` albo sam e-mail. */
export function extractFromEmail(from: string | null | undefined): string | null {
	const trimmed = (from ?? '').trim();
	if (!trimmed) return null;
	const angle = trimmed.match(/<([^<>]+)>/);
	const candidate = (angle?.[1] ?? trimmed).trim().toLowerCase();
	return EMAIL_RE.test(candidate) ? candidate : null;
}

export function isAllowedFrom(from: string | null | undefined, allowlist: readonly string[]): boolean {
	const email = extractFromEmail(from);
	if (!email) return false;
	const allowed = new Set(allowlist.map((entry) => entry.trim().toLowerCase()).filter(Boolean));
	return allowed.has(email);
}
