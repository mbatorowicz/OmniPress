import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';
import { isSafeUrl } from '@/lib/content/sanitize';

type CreatePostEditorOptions = {
	element: HTMLElement;
	initialHtml: string;
	placeholder: string;
	linkPrompt: string;
	onChange: (html: string) => void;
};

export function createPostEditor(opts: CreatePostEditorOptions): Editor {
	const editor = new Editor({
		element: opts.element,
		extensions: [
			StarterKit.configure({
				heading: { levels: [2, 3] },
				code: false,
				codeBlock: false,
				strike: false,
				horizontalRule: false,
			}),
			Link.configure({
				openOnClick: false,
				autolink: true,
				linkOnPaste: true,
				validate: (url) => isSafeUrl(url),
				HTMLAttributes: { rel: 'noopener noreferrer' },
			}),
			Placeholder.configure({ placeholder: opts.placeholder }),
		],
		content: opts.initialHtml,
		editorProps: {
			attributes: {
				class:
					'prose prose-sm max-w-none min-h-[280px] px-4 py-3 focus:outline-none text-slate-800',
			},
		},
		onUpdate: ({ editor: ed }) => {
			opts.onChange(ed.getHTML());
		},
	});

	const root = opts.element.closest('[data-rich-editor]');
	root?.querySelectorAll('[data-editor-cmd]').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			const cmd = (btn as HTMLElement).dataset.editorCmd;
			if (cmd === 'bold') editor.chain().focus().toggleBold().run();
			if (cmd === 'italic') editor.chain().focus().toggleItalic().run();
			if (cmd === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
			if (cmd === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
			if (cmd === 'bullet') editor.chain().focus().toggleBulletList().run();
			if (cmd === 'ordered') editor.chain().focus().toggleOrderedList().run();
			if (cmd === 'link') {
				const prev = editor.getAttributes('link').href as string | undefined;
				const url = window.prompt(opts.linkPrompt, prev ?? 'https://');
				if (url === null) return;
				if (url === '') {
					editor.chain().focus().extendMarkRange('link').unsetLink().run();
					return;
				}
				if (!isSafeUrl(url)) return;
				editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
			}
		});
	});

	return editor;
}
