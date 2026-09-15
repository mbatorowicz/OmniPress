import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { stripEmoji } from '@/lib/content/strip-emoji';

const key = new PluginKey('stripEmoji');

export function stripEmojiTransaction(state: EditorState): Transaction | null {
	const reps: Array<{ from: number; to: number; text: string }> = [];
	state.doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return;
		const next = stripEmoji(node.text);
		if (next === node.text) return;
		reps.push({ from: pos, to: pos + node.text.length, text: next });
	});
	if (reps.length === 0) return null;
	const tr = state.tr;
	for (let i = reps.length - 1; i >= 0; i--) {
		const rep = reps[i]!;
		tr.insertText(rep.text, rep.from, rep.to);
	}
	return tr;
}

/** IME, Win+., drop, setContent — wszystko, czego nie złapie handleTextInput. */
export const StripEmoji = Extension.create({
	name: 'stripEmoji',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key,
				appendTransaction(transactions, _old, state) {
					if (!transactions.some((item) => item.docChanged)) return null;
					return stripEmojiTransaction(state);
				},
			}),
		];
	},
});
