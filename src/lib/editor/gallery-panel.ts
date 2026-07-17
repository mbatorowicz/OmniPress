import { uploadPostAsset } from '@/lib/editor/upload-asset';
import type { GalleryAsset } from './client-init';
import { iconButtonHtml, stepButtonHtml } from '@/lib/ui/button-markup';

type GalleryLabels = {
	cover: string;
	gallery: string;
	moveUp: string;
	moveDown: string;
	remove: string;
	confirmRemove: string;
	removeFailed: string;
	empty: string;
	add: string;
};

let order: GalleryAsset[] = [];

function syncOrderInput(root: HTMLElement): void {
	const input = root.querySelector('[data-gallery-order]');
	if (input instanceof HTMLInputElement) {
		input.value = order.map((a) => a.id).join(',');
	}
}

function renderGallery(root: HTMLElement, labels: GalleryLabels, postId: string): void {
	const grid = root.querySelector('[data-gallery-grid]');
	const empty = root.querySelector('[data-gallery-empty]');
	if (!(grid instanceof HTMLElement)) return;

	grid.innerHTML = '';

	if (order.length === 0) {
		empty?.classList.remove('hidden');
		syncOrderInput(root);
		return;
	}

	empty?.classList.add('hidden');

	order.forEach((asset, index) => {
		const card = document.createElement('div');
		card.className = 'ui-gallery-card';
		card.dataset.assetId = asset.id;

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
					${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { 'data-gallery-up': '' } })}
					${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === order.length - 1, attrs: { 'data-gallery-down': '' } })}
					${iconButtonHtml({ variant: 'iconDanger', ariaLabel: labels.remove, icon: 'x', attrs: { 'data-gallery-remove': '' } })}
				</div>
			</div>
		`;

		card.querySelector('[data-gallery-up]')?.addEventListener('click', () => {
			if (index <= 0) return;
			const next = [...order];
			[next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
			order = next;
			renderGallery(root, labels, postId);
		});

		card.querySelector('[data-gallery-down]')?.addEventListener('click', () => {
			if (index >= order.length - 1) return;
			const next = [...order];
			[next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
			order = next;
			renderGallery(root, labels, postId);
		});

		card.querySelector('[data-gallery-remove]')?.addEventListener('click', async () => {
			if (!confirm(labels.confirmRemove)) return;

			const btn = card.querySelector('[data-gallery-remove]');
			btn?.setAttribute('disabled', 'true');

			try {
				const res = await fetch(`/api/posts/${postId}/assets/${asset.id}`, {
					method: 'DELETE',
					credentials: 'same-origin',
				});
				const data = await res.json();
				if (!res.ok) {
					alert(data.error ?? labels.removeFailed);
					btn?.removeAttribute('disabled');
					return;
				}
				order = order.filter((a) => a.id !== asset.id);
				renderGallery(root, labels, postId);
			} catch {
				alert(labels.removeFailed);
				btn?.removeAttribute('disabled');
			}
		});

		grid.appendChild(card);
	});

	syncOrderInput(root);
}

export function mountGalleryPanel(
	root: HTMLElement,
	initialAssets: GalleryAsset[],
	labels: GalleryLabels,
): void {
	const postId = root.dataset.postId;
	if (!postId) return;

	order = [...initialAssets];
	renderGallery(root, labels, postId);

	const input = root.querySelector('[data-gallery-upload]');
	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement)) return;
		const files = input.files;
		if (!files?.length) return;

		const label = root.querySelector('[data-gallery-upload-label]');
		label?.classList.add('opacity-50', 'pointer-events-none');

		const uploadLabels = {
			uploadFailed: root.dataset.labelUploadFailed ?? '',
			networkError: root.dataset.labelNetworkError ?? '',
		};

		for (const file of Array.from(files)) {
			const result = await uploadPostAsset(postId, file, 'gallery', uploadLabels);
			if (!result.ok) {
				alert(result.error || `${uploadLabels.uploadFailed}: ${file.name}`);
				continue;
			}
			order.push({
				id: result.asset.id,
				url: result.asset.url,
				filename: result.asset.filename,
			});
		}
		renderGallery(root, labels, postId);

		input.value = '';
		label?.classList.remove('opacity-50', 'pointer-events-none');
	});
}

export function appendGalleryAsset(root: HTMLElement, asset: GalleryAsset, labels: GalleryLabels): void {
	const postId = root.dataset.postId;
	if (!postId) return;
	order.push(asset);
	renderGallery(root, labels, postId);
}
