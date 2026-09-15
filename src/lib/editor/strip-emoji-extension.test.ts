/**
 * @vitest-environment jsdom
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { StripEmoji } from './strip-emoji-extension';

function createEditor(html: string): Editor {
	return new Editor({
		element: document.createElement('div'),
		extensions: [StarterKit, StripEmoji],
		content: html,
	});
}

describe('StripEmoji extension', () => {
	it('usuwa emoji przy setContent', () => {
		const editor = createEditor('<p>ok</p>');
		editor.commands.setContent('<p>📅 9 sierpnia 💰 oszczędności</p>');
		expect(editor.getText()).toContain('9 sierpnia');
		expect(editor.getText()).toContain('oszczędności');
		expect(editor.getHTML()).not.toMatch(/📅|💰/);
		editor.destroy();
	});

	it('usuwa emoji przy insertContent', () => {
		const editor = createEditor('<p>ok</p>');
		editor.commands.insertContent(' 💰 oszczędności');
		expect(editor.getText()).toContain('oszczędności');
		expect(editor.getHTML()).not.toMatch(/💰/);
		editor.destroy();
	});

	it('zostawia znacznik załącznika 📄', () => {
		const editor = createEditor('<p>[📄 raport.pdf](./a.pdf)</p>');
		expect(editor.getText()).toContain('📄');
		editor.destroy();
	});
});
