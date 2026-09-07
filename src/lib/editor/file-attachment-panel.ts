/**
 * Panele załączników plikowych: PDF, DOCX i pliki do pobrania (GPKG/XLSX/ZIP).
 * Różnią się tylko prefiksem `data-*` i tym, że PDF wybiera tryb wyświetlania.
 * Mechanizm: `@/lib/editor/attachment-panel`.
 */
import {
	createAttachmentPanel,
	type AttachmentAsset,
	type AttachmentItemContext,
	type AttachmentPanelLabels,
} from '@/lib/editor/attachment-panel';
import { iconButtonHtml, stepButtonHtml } from '@/lib/ui/button-markup';
import { iconSvg } from '@/lib/ui/icons';
import { isSafeUrl } from '@/lib/content/sanitize-url';

export type FileAttachmentKind = 'pdf' | 'docx' | 'file';

export type FileAttachmentAsset = AttachmentAsset;

type FileAttachmentLabels = AttachmentPanelLabels & {
	displayLink: string;
	displayEmbed: string;
};

function readLabels(root: HTMLElement): FileAttachmentLabels {
	return {
		displayLink: root.dataset.labelLink ?? '',
		displayEmbed: root.dataset.labelEmbed ?? '',
		moveUp: root.dataset.labelMoveUp ?? '',
		moveDown: root.dataset.labelMoveDown ?? '',
		remove: root.dataset.labelRemove ?? '',
		confirmRemove: root.dataset.labelConfirmRemove ?? '',
		removeFailed: root.dataset.labelRemoveFailed ?? '',
	};
}

function appendDisplayMode(host: HTMLElement, asset: FileAttachmentAsset, labels: FileAttachmentLabels): void {
	const fieldset = document.createElement('fieldset');
	fieldset.className = 'ui-label-muted flex shrink-0 flex-col gap-1 text-xs';

	for (const mode of ['link', 'embed'] as const) {
		const label = document.createElement('label');
		label.className = 'flex cursor-pointer items-center gap-2';
		const input = document.createElement('input');
		input.type = 'radio';
		input.name = `asset_mode_${asset.id}`;
		input.value = mode;
		input.className = 'text-brand';
		input.checked = mode === 'embed' ? asset.display_mode === 'embed' : asset.display_mode !== 'embed';
		const text = document.createElement('span');
		text.textContent = mode === 'link' ? labels.displayLink : labels.displayEmbed;
		label.append(input, text);
		fieldset.append(label);
	}

	host.append(fieldset);
}

function renderRow(
	ctx: AttachmentItemContext<FileAttachmentAsset, FileAttachmentLabels>,
	withDisplayMode: boolean,
): HTMLElement {
	const { asset, index, total, labels, attr } = ctx;
	const li = document.createElement('li');
	li.className = 'ui-inline-card';

	const body = document.createElement('div');
	body.className = 'min-w-0 flex-1';

	const title = document.createElement('p');
	title.className = 'ui-subheading flex items-center gap-1.5 truncate';
	const icon = document.createElement('span');
	icon.className = 'inline-flex shrink-0 ui-muted pointer-events-none';
	icon.innerHTML = iconSvg('file-text', 16);
	const name = document.createElement('span');
	name.className = 'truncate';
	name.textContent = asset.filename;
	title.append(icon, name);

	const link = document.createElement('a');
	link.className = 'ui-link text-xs';
	link.target = '_blank';
	link.rel = 'noopener noreferrer';
	if (isSafeUrl(asset.url)) {
		link.href = asset.url;
		link.textContent = asset.url;
	}

	body.append(title, link);
	li.append(body);
	if (withDisplayMode) appendDisplayMode(li, asset, labels);

	const actions = document.createElement('div');
	actions.className = 'flex shrink-0 gap-1';
	actions.innerHTML = `
		${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { [attr('up')]: '' } })}
		${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === total - 1, attrs: { [attr('down')]: '' } })}
		${iconButtonHtml({ variant: 'iconDanger', ariaLabel: labels.remove, icon: 'x', attrs: { [attr('remove')]: '' } })}
	`;
	li.append(actions);
	return li;
}

export function mountFileAttachmentPanel(
	root: HTMLElement,
	kind: FileAttachmentKind,
	initialAssets: FileAttachmentAsset[],
): void {
	const withDisplayMode = kind === 'pdf';

	createAttachmentPanel<FileAttachmentAsset, FileAttachmentLabels>(root, {
		prefix: kind,
		kind,
		labels: readLabels(root),
		initialAssets,
		renderItem: (ctx) => renderRow(ctx, withDisplayMode),
		toAsset: (uploaded) => ({
			id: uploaded.id,
			url: uploaded.url,
			filename: uploaded.filename,
			...(withDisplayMode ? { display_mode: uploaded.display_mode } : {}),
		}),
	});
}
