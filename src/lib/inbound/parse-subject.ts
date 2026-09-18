import { preparePlainTitle } from '@/lib/content/strip-emoji';

const PREFIX_RE = /^(re|fwd?|odp\.?)\s*:\s*/i;
const MAX_PREFIXES = 8;

/** Temat maila → tytuł szkicu: zdejmij Re/Fwd/Odp/FW, potem preparePlainTitle. */
export function parseInboundSubject(raw: string | null | undefined): string {
	let subject = (raw ?? '').replace(/\s+/g, ' ').trim();
	for (let i = 0; i < MAX_PREFIXES; i++) {
		const next = subject.replace(PREFIX_RE, '');
		if (next === subject) break;
		subject = next;
	}
	return preparePlainTitle(subject);
}
