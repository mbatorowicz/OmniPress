import { extractFromEmail } from './allowlist';

const FROM_LINE = /^(?:(?:>+\s*)?(?:from|od|de)\s*:\s*)(.+)$/i;

function emailsInOrder(text: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
		const match = line.trim().match(FROM_LINE);
		if (!match) continue;
		const email = extractFromEmail(match[1]);
		if (!email || seen.has(email)) continue;
		seen.add(email);
		out.push(email);
	}
	return out;
}

/** From-y z bloków przekierowania, od zewnątrz (kto najbliżej odbiorcy). */
export function extractForwardHops(text: string): string[] {
	if (!text.trim()) return [];
	return emailsInOrder(text);
}

/**
 * Hop, który przekazał maila do Ciebie: pierwszy From spoza allowlisty.
 * Zagnieżdżone (pismo, dalsi przekazujący) olewamy.
 */
export function correspondentEmail(
	body: string,
	allowlist: readonly string[],
): string | null {
	const skip = new Set(allowlist.map((entry) => entry.trim().toLowerCase()).filter(Boolean));
	for (const hop of extractForwardHops(body)) {
		if (!skip.has(hop)) return hop;
	}
	return null;
}
