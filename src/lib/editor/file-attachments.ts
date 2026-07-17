import { uploadPostAsset } from '@/lib/editor/upload-asset';
import { iconButtonHtml, stepButtonHtml } from '@/lib/ui/button-markup';
import { iconSvg } from '@/lib/ui/icons';

export type FileAsset = {
	id: string;
	url: string;
	filename: string;
};

type FileLabels = {
	moveUp: string;
	moveDown: string;
	remove: string;
	confirmRemove: string;
	removeFailed: string;
};

let order: FileAsset[] = [];

function readLabels(root: HTMLElement): FileLabels {
	return {
		moveUp: root.dataset.labelMoveUp ?? '',
		moveDown: root.dataset.labelMoveDown ?? '',
		remove: root.dataset.labelRemove ?? '',
		confirmRemove: root.dataset.labelConfirmRemove ?? '',
		removeFailed: root.dataset.labelRemoveFailed ?? '',
	};
}

function syncOrderInput(root: HTMLElement): void {
	const input = root.querySelector('[data-file-order]');
	if (input instanceof HTMLInputElement) {
		input.value = order.map((a) => a.id).join(',');
	}
}

function syncFileEmptyState(root: HTMLElement): void {
	const list = root.querySelector('[data-file-list]');
	const empty = root.querySelector('[data-file-empty]');
	if (!(list instanceof HTMLElement)) return;
	empty?.classList.toggle('hidden', list.children.length > 0);
}

function renderFileList(root: HTMLElement, labels: FileLabels, postId: string): void {
	const list = root.querySelector('[data-file-list]');
	if (!(list instanceof HTMLElement)) return;

	list.innerHTML = '';

	if (order.length === 0) {
		syncFileEmptyState(root);
		syncOrderInput(root);
		return;
	}

	syncFileEmptyState(root);

	order.forEach((asset, index) => {
		const li = document.createElement('li');
		li.className = 'ui-inline-card';
		li.dataset.assetId = asset.id;

		const removeBtn = iconButtonHtml({
			variant: 'iconDanger',
			ariaLabel: labels.remove,
			icon: 'x',
			attrs: { 'data-file-remove': '' },
		});

		li.innerHTML = `
			<div class="min-w-0 flex-1">
				<p class="ui-subheading flex items-center gap-1.5 truncate">
					<span class="inline-flex shrink-0 ui-muted pointer-events-none">${iconSvg('file-text', 16)}</span>
					<span class="truncate">${asset.filename}</span>
				</p>
				<a href="${asset.url}" target="_blank" rel="noopener noreferrer" class="ui-link text-xs">${asset.url}</a>
			</div>
			<div class="flex shrink-0 gap-1">
				${stepButtonHtml({ ariaLabel: labels.moveUp, label: '↑', disabled: index === 0, attrs: { 'data-file-up': '' } })}
				${stepButtonHtml({ ariaLabel: labels.moveDown, label: '↓', disabled: index === order.length - 1, attrs: { 'data-file-down': '' } })}
				${removeBtn}
			</div>
		`;

		li.querySelector('[data-file-up]')?.addEventListener('click', () => {
			if (index <= 0) return;
			const next = [...order];
			[next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
			order = next;
			renderFileList(root, labels, postId);
		});

		li.querySelector('[data-file-down]')?.addEventListener('click', () => {
			if (index >= order.length - 1) return;
			const next = [...order];
			[next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
			order = next;
			renderFileList(root, labels, postId);
		});

		li.querySelector('[data-file-remove]')?.addEventListener('click', async () => {
			if (!confirm(labels.confirmRemove)) return;

			const btn = li.querySelector('[data-file-remove]');
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
				renderFileList(root, labels, postId);
			} catch {
				alert(labels.removeFailed);
				btn?.removeAttribute('disabled');
			}
		});

		list.appendChild(li);
	});

	syncOrderInput(root);
}

export function mountFileAttachments(
	root: HTMLElement,
	initialAssets: FileAsset[],
): void {
	const postId = root.dataset.postId;
	if (!postId) return;

	const labels = readLabels(root);
	order = [...initialAssets];
	renderFileList(root, labels, postId);

	const input = root.querySelector('[data-file-upload]');
	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement)) return;
		const file = input.files?.[0];
		if (!file) return;

		const btn = input.closest('label');
		btn?.classList.add('opacity-50', 'pointer-events-none');

		const result = await uploadPostAsset(postId, file, 'file', {
			uploadFailed: root.dataset.labelUploadFailed ?? '',
			networkError: root.dataset.labelNetworkError ?? '',
		});
		if (!result.ok) {
			alert(result.error);
		} else {
			order.push({
				id: result.asset.id,
				url: result.asset.url,
				filename: result.asset.filename,
			});
			renderFileList(root, labels, postId);
		}

		input.value = '';
		btn?.classList.remove('opacity-50', 'pointer-events-none');
	});
}
