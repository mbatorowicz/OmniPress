import type { GalleryAsset } from './client-init';

type GalleryLabels = {
	cover: string;
	gallery: string;
	moveUp: string;
	moveDown: string;
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

function renderGallery(root: HTMLElement, labels: GalleryLabels): void {
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
		card.className =
			'relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm';
		card.dataset.assetId = asset.id;

		const badge =
			index === 0
				? `<span class="absolute left-2 top-2 z-10 rounded bg-brand px-2 py-0.5 text-xs font-medium text-white">${labels.cover}</span>`
				: `<span class="absolute left-2 top-2 z-10 rounded bg-slate-700/80 px-2 py-0.5 text-xs text-white">${labels.gallery}</span>`;

		card.innerHTML = `
			${badge}
			<img src="${asset.url}" alt="${asset.filename}" class="aspect-[4/3] w-full object-cover" loading="lazy" />
			<div class="flex items-center justify-between gap-1 border-t border-slate-100 px-2 py-1.5">
				<span class="truncate text-xs text-slate-600" title="${asset.filename}">${asset.filename}</span>
				<div class="flex shrink-0 gap-1">
					<button type="button" data-gallery-up class="rounded border border-slate-200 px-1.5 py-0.5 text-xs hover:bg-slate-50" ${index === 0 ? 'disabled' : ''} aria-label="${labels.moveUp}">↑</button>
					<button type="button" data-gallery-down class="rounded border border-slate-200 px-1.5 py-0.5 text-xs hover:bg-slate-50" ${index === order.length - 1 ? 'disabled' : ''} aria-label="${labels.moveDown}">↓</button>
				</div>
			</div>
		`;

		card.querySelector('[data-gallery-up]')?.addEventListener('click', () => {
			if (index <= 0) return;
			const next = [...order];
			[next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
			order = next;
			renderGallery(root, labels);
		});

		card.querySelector('[data-gallery-down]')?.addEventListener('click', () => {
			if (index >= order.length - 1) return;
			const next = [...order];
			[next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
			order = next;
			renderGallery(root, labels);
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
	order = [...initialAssets];
	renderGallery(root, labels);

	const postId = root.dataset.postId;
	const input = root.querySelector('[data-gallery-upload]');
	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement)) return;
		const files = input.files;
		if (!files?.length || !postId) return;

		const label = root.querySelector('[data-gallery-upload-label]');
		label?.classList.add('opacity-50', 'pointer-events-none');

		try {
			for (const file of Array.from(files)) {
				const fd = new FormData();
				fd.append('file', file);
				fd.append('kind', 'gallery');

				const res = await fetch(`/api/posts/${postId}/upload`, {
					method: 'POST',
					body: fd,
					credentials: 'same-origin',
				});
				const data = await res.json();
				if (!res.ok || !data.asset) {
					alert(data.error ?? `Upload nie powiódł się: ${file.name}`);
					continue;
				}
				order.push({
					id: data.asset.id,
					url: data.asset.url,
					filename: data.asset.filename,
				});
			}
			renderGallery(root, labels);
		} catch {
			alert('Błąd połączenia przy uploadzie.');
		} finally {
			input.value = '';
			label?.classList.remove('opacity-50', 'pointer-events-none');
		}
	});
}

export function appendGalleryAsset(root: HTMLElement, asset: GalleryAsset, labels: GalleryLabels): void {
	order.push(asset);
	renderGallery(root, labels);
}
