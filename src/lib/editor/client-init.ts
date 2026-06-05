import { editorHtmlToMarkdown, markdownToEditorHtml } from './html-markdown';

export type GalleryAsset = {
	id: string;
	url: string;
	filename: string;
};

export function initPostRichEditor(initialMarkdown: string, placeholder: string): void {
	const root = document.querySelector('[data-rich-editor]');
	const mount = root?.querySelector('[data-tiptap-mount]');
	const hidden = root?.querySelector('[data-content-md]');
	const form = root?.closest('form');
	if (!(mount instanceof HTMLElement) || !(hidden instanceof HTMLTextAreaElement)) return;

	void import('@/lib/editor/tiptap-editor').then(({ createPostEditor }) => {
		const editor = createPostEditor({
			element: mount,
			initialHtml: markdownToEditorHtml(initialMarkdown),
			placeholder,
			onChange(html) {
				hidden.value = editorHtmlToMarkdown(html);
			},
		});

		hidden.value = editorHtmlToMarkdown(editor.getHTML());

		form?.addEventListener('submit', () => {
			hidden.value = editorHtmlToMarkdown(editor.getHTML());
		});
	});
}

export function initPostGallery(initialAssets: GalleryAsset[], labels: Record<string, string>): void {
	const root = document.querySelector('[data-gallery-panel]');
	if (!(root instanceof HTMLElement)) return;

	void import('@/lib/editor/gallery-panel').then(({ mountGalleryPanel }) => {
		mountGalleryPanel(root, initialAssets, labels);
	});
}

export function initPdfAttachments(): void {
	const root = document.querySelector('[data-pdf-attachments]');
	if (!(root instanceof HTMLElement)) return;

	void import('@/lib/editor/pdf-attachments').then(({ mountPdfAttachments }) => {
		mountPdfAttachments(root);
	});
}
