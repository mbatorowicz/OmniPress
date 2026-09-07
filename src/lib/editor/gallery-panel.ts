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
import { isSafeUrl } from '@/lib/content/sanitize-url';

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

	const badge = document.createElement('span');
	badge.className = index === 0 ? 'ui-gallery-cover-badge' : 'ui-gallery-badge-secondary';
	badge.textContent = index === 0 ? labels.cover : labels.gallery;

	const img = document.createElement('img');
	if (isSafeUrl(asset.url)) img.src = asset.url;
	img.alt = asset.filename;
	img.className = 'aspect-[4/3] w-full object-cover';
	img.loading = 'lazy';

	const footer = document.createElement('div');
	footer.className = 'ui-gallery-card-footer';

	const name = document.createElement('span');
	name.className = 'ui-hint truncate';
	name.title = asset.filename;
	name.textContent = asset.filename;

	const actions = document.createElement('div');
	actions.className = 'flex shrink-0 gap-1';
	actions.innerHTML = `
		${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { [attr('up')]: '' } })}
		${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === total - 1, attrs: { [attr('down')]: '' } })}
		${iconButtonHtml({ variant: 'iconDanger', ariaLabel: labels.remove, icon: 'x', attrs: { [attr('remove')]: '' } })}
	`;

	footer.append(name, actions);
	card.append(badge, img, footer);
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
