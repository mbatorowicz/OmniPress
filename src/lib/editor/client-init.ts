import { editorHtmlToMarkdown, markdownToEditorHtml } from './html-markdown';

export type GalleryAsset = {
	id: string;
	url: string;
	filename: string;
};

export function initPostRichEditor(): void {
	const root = document.querySelector('[data-rich-editor]');
	const mount = root?.querySelector('[data-tiptap-mount]');
	const hidden = root?.querySelector('[data-content-md]');
	const form = root?.closest('form');
	if (!(root instanceof HTMLElement) || !(mount instanceof HTMLElement) || !(hidden instanceof HTMLTextAreaElement)) {
		return;
	}

	const initialMarkdown = hidden.value;
	const placeholder = root.dataset.placeholder ?? '';

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

export function initPostGallery(): void {
	const root = document.querySelector('[data-gallery-panel]');
	if (!(root instanceof HTMLElement)) return;

	let initialAssets: GalleryAsset[] = [];
	try {
		initialAssets = JSON.parse(root.dataset.initialAssets ?? '[]') as GalleryAsset[];
	} catch {
		initialAssets = [];
	}

	const labels = {
		cover: root.dataset.labelCover ?? '',
		gallery: root.dataset.labelGallery ?? '',
		moveUp: root.dataset.labelMoveUp ?? '',
		moveDown: root.dataset.labelMoveDown ?? '',
		remove: root.dataset.labelRemove ?? '',
		confirmRemove: root.dataset.labelConfirmRemove ?? '',
		removeFailed: root.dataset.labelRemoveFailed ?? '',
		empty: root.dataset.labelEmpty ?? '',
		add: root.dataset.labelAdd ?? '',
	};

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
