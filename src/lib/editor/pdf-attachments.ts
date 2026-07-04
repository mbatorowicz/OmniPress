import { iconButtonHtml, stepButtonHtml } from '@/lib/ui/button-markup';
import { iconSvg } from '@/lib/ui/icons';

export type PdfAsset = {
	id: string;
	url: string;
	filename: string;
	display_mode?: string;
};

type PdfLabels = {
	displayLink: string;
	displayEmbed: string;
	moveUp: string;
	moveDown: string;
	remove: string;
	confirmRemove: string;
	removeFailed: string;
};

let order: PdfAsset[] = [];

function readLabels(root: HTMLElement): PdfLabels {
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

function syncOrderInput(root: HTMLElement): void {
	const input = root.querySelector('[data-pdf-order]');
	if (input instanceof HTMLInputElement) {
		input.value = order.map((a) => a.id).join(',');
	}
}

function syncPdfEmptyState(root: HTMLElement): void {
	const list = root.querySelector('[data-pdf-list]');
	const empty = root.querySelector('[data-pdf-empty]');
	if (!(list instanceof HTMLElement)) return;
	empty?.classList.toggle('hidden', list.children.length > 0);
}

function renderPdfList(root: HTMLElement, labels: PdfLabels, postId: string): void {
	const list = root.querySelector('[data-pdf-list]');
	if (!(list instanceof HTMLElement)) return;

	list.innerHTML = '';

	if (order.length === 0) {
		syncPdfEmptyState(root);
		syncOrderInput(root);
		return;
	}

	syncPdfEmptyState(root);

	order.forEach((asset, index) => {
		const li = document.createElement('li');
		li.className = 'ui-inline-card';
		li.dataset.assetId = asset.id;

		const removeBtn = iconButtonHtml({
			variant: 'iconDanger',
			ariaLabel: labels.remove,
			icon: 'x',
			attrs: { 'data-pdf-remove': '' },
		});

		li.innerHTML = `
			<div class="min-w-0 flex-1">
				<p class="ui-subheading flex items-center gap-1.5 truncate">
					<span class="inline-flex shrink-0 ui-muted pointer-events-none">${iconSvg('file-text', 16)}</span>
					<span class="truncate">${asset.filename}</span>
				</p>
				<a href="${asset.url}" target="_blank" rel="noopener noreferrer" class="ui-link text-xs">${asset.url}</a>
			</div>
			<fieldset class="ui-label-muted flex shrink-0 flex-col gap-1 text-xs">
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="asset_mode_${asset.id}" value="link" class="text-brand" ${asset.display_mode !== 'embed' ? 'checked' : ''} />
					<span data-label-link></span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="asset_mode_${asset.id}" value="embed" class="text-brand" ${asset.display_mode === 'embed' ? 'checked' : ''} />
					<span data-label-embed></span>
				</label>
			</fieldset>
			<div class="flex shrink-0 gap-1">
				${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { 'data-pdf-up': '' } })}
				${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === order.length - 1, attrs: { 'data-pdf-down': '' } })}
				${removeBtn}
			</div>
		`;

		const labelLink = li.querySelector('[data-label-link]');
		const labelEmbed = li.querySelector('[data-label-embed]');
		if (labelLink) labelLink.textContent = labels.displayLink;
		if (labelEmbed) labelEmbed.textContent = labels.displayEmbed;

		li.querySelector('[data-pdf-up]')?.addEventListener('click', () => {
			if (index <= 0) return;
			const next = [...order];
			[next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
			order = next;
			renderPdfList(root, labels, postId);
		});

		li.querySelector('[data-pdf-down]')?.addEventListener('click', () => {
			if (index >= order.length - 1) return;
			const next = [...order];
			[next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
			order = next;
			renderPdfList(root, labels, postId);
		});

		li.querySelector('[data-pdf-remove]')?.addEventListener('click', async () => {
			if (!confirm(labels.confirmRemove)) return;

			const btn = li.querySelector('[data-pdf-remove]');
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
				renderPdfList(root, labels, postId);
			} catch {
				alert(labels.removeFailed);
				btn?.removeAttribute('disabled');
			}
		});

		list.appendChild(li);
	});

	syncOrderInput(root);
}

export function mountPdfAttachments(
	root: HTMLElement,
	initialAssets: PdfAsset[],
): void {
	const postId = root.dataset.postId;
	if (!postId) return;

	const labels = readLabels(root);
	order = [...initialAssets];
	renderPdfList(root, labels, postId);

	const input = root.querySelector('[data-pdf-upload]');
	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement)) return;
		const file = input.files?.[0];
		if (!file) return;

		const fd = new FormData();
		fd.append('file', file);
		fd.append('kind', 'pdf');

		const btn = input.closest('label');
		btn?.classList.add('opacity-50', 'pointer-events-none');

		try {
			const res = await fetch(`/api/posts/${postId}/upload`, {
				method: 'POST',
				body: fd,
				credentials: 'same-origin',
			});
			const data = await res.json();
			if (!res.ok || !data.asset) {
				alert(data.error ?? 'Upload nie powiódł się');
				return;
			}
			order.push({
				id: data.asset.id,
				url: data.asset.url,
				filename: data.asset.filename,
				display_mode: data.asset.display_mode,
			});
			renderPdfList(root, labels, postId);
		} catch {
			alert('Błąd połączenia przy uploadzie.');
		} finally {
			input.value = '';
			btn?.classList.remove('opacity-50', 'pointer-events-none');
		}
	});
}
