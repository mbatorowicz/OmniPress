import { filterTypedText } from '@/lib/content/strip-emoji';

/** Pole jednoliniowe (tytuł): ta sama reguła co treść edytora. */
export function bindPlainTextEmojiFilter(el: HTMLInputElement | HTMLTextAreaElement): void {
	const apply = () => {
		const { text, handled } = filterTypedText(el.value);
		if (!handled) return;
		const pos = el.selectionStart;
		el.value = text;
		if (pos == null) return;
		const next = Math.min(pos, text.length);
		el.setSelectionRange(next, next);
	};
	el.addEventListener('input', apply);
}
