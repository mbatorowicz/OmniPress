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

/** Radio link/podgląd — tylko PDF, reszta plików ma jedną formę prezentacji. */
function displayModeFieldset(asset: FileAttachmentAsset): string {
	return `
			<fieldset class="ui-label-muted flex shrink-0 flex-col gap-1 text-xs">
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="asset_mode_${asset.id}" value="link" class="text-brand" ${asset.display_mode !== 'embed' ? 'checked' : ''} />
					<span data-label-link></span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="asset_mode_${asset.id}" value="embed" class="text-brand" ${asset.display_mode === 'embed' ? 'checked' : ''} />
					<span data-label-embed></span>
				</label>
			</fieldset>`;
}

function renderRow(
	ctx: AttachmentItemContext<FileAttachmentAsset, FileAttachmentLabels>,
	withDisplayMode: boolean,
): HTMLElement {
	const { asset, index, total, labels, attr } = ctx;
	const li = document.createElement('li');
	li.className = 'ui-inline-card';

	li.innerHTML = `
			<div class="min-w-0 flex-1">
				<p class="ui-subheading flex items-center gap-1.5 truncate">
					<span class="inline-flex shrink-0 ui-muted pointer-events-none">${iconSvg('file-text', 16)}</span>
					<span class="truncate">${asset.filename}</span>
				</p>
				<a href="${asset.url}" target="_blank" rel="noopener noreferrer" class="ui-link text-xs">${asset.url}</a>
			</div>${withDisplayMode ? displayModeFieldset(asset) : ''}
			<div class="flex shrink-0 gap-1">
				${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { [attr('up')]: '' } })}
				${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === total - 1, attrs: { [attr('down')]: '' } })}
				${iconButtonHtml({ variant: 'iconDanger', ariaLabel: labels.remove, icon: 'x', attrs: { [attr('remove')]: '' } })}
			</div>
		`;

	if (withDisplayMode) {
		const labelLink = li.querySelector('[data-label-link]');
		const labelEmbed = li.querySelector('[data-label-embed]');
		if (labelLink) labelLink.textContent = labels.displayLink;
		if (labelEmbed) labelEmbed.textContent = labels.displayEmbed;
	}

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
