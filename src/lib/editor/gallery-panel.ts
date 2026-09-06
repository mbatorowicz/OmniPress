/**
 * Panel galerii zdjęć — kafelki zamiast wierszy, pierwszy element jest okładką.
 * Mechanizm (kolejność, usuwanie, upload): `@/lib/editor/attachment-panel`.
 */
import {
	createAttachmentPanel,
	type AttachmentItemContext,
	type AttachmentPanelLabels,
} from '@/lib/editor/attachment-panel';
import { renderPendingGalleryCard } from '@/lib/editor/attachment-pending';
import type { GalleryAsset } from './client-init';
import { iconButtonHtml, stepButtonHtml } from '@/lib/ui/button-markup';

export type GalleryLabels = AttachmentPanelLabels & {
	cover: string;
	gallery: string;
	empty: string;
	add: string;
};

function renderCard(ctx: AttachmentItemContext<GalleryAsset, GalleryLabels>): HTMLElement {
	const { asset, index, total, labels, attr } = ctx;
	const card = document.createElement('div');
	card.className = 'ui-gallery-card';

	const badge =
		index === 0
			? `<span class="ui-gallery-cover-badge">${labels.cover}</span>`
			: `<span class="ui-gallery-badge-secondary">${labels.gallery}</span>`;

	card.innerHTML = `
			${badge}
			<img src="${asset.url}" alt="${asset.filename}" class="aspect-[4/3] w-full object-cover" loading="lazy" />
			<div class="ui-gallery-card-footer">
				<span class="ui-hint truncate" title="${asset.filename}">${asset.filename}</span>
				<div class="flex shrink-0 gap-1">
					${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { [attr('up')]: '' } })}
					${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === total - 1, attrs: { [attr('down')]: '' } })}
					${iconButtonHtml({ variant: 'iconDanger', ariaLabel: labels.remove, icon: 'x', attrs: { [attr('remove')]: '' } })}
				</div>
			</div>
		`;

	return card;
}

export function mountGalleryPanel(
	root: HTMLElement,
	initialAssets: GalleryAsset[],
	labels: GalleryLabels,
): void {
	createAttachmentPanel<GalleryAsset, GalleryLabels>(root, {
		prefix: 'gallery',
		kind: 'gallery',
		labels,
		initialAssets,
		multiple: true,
		listSelector: '[data-gallery-grid]',
		uploadBusySelector: '[data-gallery-upload-label]',
		renderItem: renderCard,
		renderPending: renderPendingGalleryCard,
		toAsset: (uploaded) => ({
			id: uploaded.id,
			url: uploaded.url,
			filename: uploaded.filename,
		}),
	});
}
