/**
 * Emoji nie wchodzą do treści redaktora.
 * 📄 / 📎 zostają — publikacja i import rozpoznają po nich załączniki.
 */

const FILE_KEEP = ['\u{1F4C4}', '\u{1F4CE}'] as const;
const KEEP_OPEN = '\uE002KEEP:';
const KEEP_CLOSE = '\uE003';

const EMOJI_RE =
	/\p{RI}\p{RI}|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u20E3)*(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u20E3)*)*|[0-9#*]\uFE0F\u20E3/gu;

export function stripEmoji(text: string): string {
	if (!text) return text;
	const placeholders: string[] = [];
	let work = text;
	for (const ch of FILE_KEEP) {
		if (!work.includes(ch)) continue;
		work = work.replaceAll(ch, () => {
			const i = placeholders.length;
			placeholders.push(ch);
			return `${KEEP_OPEN}${i}${KEEP_CLOSE}`;
		});
	}
	const stripped = work.replace(EMOJI_RE, '');
	const restored = stripped.replace(/\uE002KEEP:(\d+)\uE003/g, (_, i: string) => placeholders[Number(i)] ?? '');
	if (restored === text) return text;
	return restored.replace(/[^\S\n]{2,}/g, ' ').replace(/^[^\S\n]+/, '').replace(/[^\S\n]+$/, '');
}

/** Wpis z klawiatury / wklejka: `handled` = przechwyć (puste = zignoruj). */
export function filterTypedText(text: string): { text: string; handled: boolean } {
	const next = stripEmoji(text);
	if (next === text) return { text, handled: false };
	return { text: next, handled: true };
}
