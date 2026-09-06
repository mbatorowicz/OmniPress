/**
 * Wspólny mechanizm paneli załączników (galeria, PDF, DOCX, pliki do pobrania):
 * kolejność, przenoszenie, usuwanie, upload. Różni je wyłącznie markup wiersza —
 * dostarcza go `renderItem`.
 */
import { uploadSelectedFiles } from '@/lib/editor/attachment-upload';
import {
	renderPendingAttachmentRow,
	revokeBlobUrl,
	revokePendingPreview,
	type PendingUpload,
} from '@/lib/editor/attachment-pending';
import type { UploadKind, UploadedAsset } from '@/lib/editor/upload-asset';

export type AttachmentAsset = {
	id: string;
	url: string;
	filename: string;
	display_mode?: string;
};

export type AttachmentPanelLabels = {
	moveUp: string;
	moveDown: string;
	remove: string;
	confirmRemove: string;
	removeFailed: string;
};

export type AttachmentItemContext<A extends AttachmentAsset, L extends AttachmentPanelLabels> = {
	asset: A;
	index: number;
	total: number;
	labels: L;
	attr: (action: 'up' | 'down' | 'remove') => string;
};

export type AttachmentPanelConfig<A extends AttachmentAsset, L extends AttachmentPanelLabels> = {
	prefix: string;
	kind: UploadKind;
	labels: L;
	initialAssets: A[];
	renderItem: (ctx: AttachmentItemContext<A, L>) => HTMLElement;
	renderPending?: (pending: PendingUpload, uploadingLabel: string) => HTMLElement;
	listSelector?: string;
	emptySelector?: string;
	uploadBusySelector?: string;
	multiple?: boolean;
	toAsset: (uploaded: UploadedAsset) => A;
};

export type AttachmentPanel<A extends AttachmentAsset> = {
	append: (asset: A) => void;
};

export function createAttachmentPanel<A extends AttachmentAsset, L extends AttachmentPanelLabels>(
	root: HTMLElement,
	config: AttachmentPanelConfig<A, L>,
): AttachmentPanel<A> | null {
	const postId = root.dataset.postId;
	if (!postId) return null;

	const { prefix, labels } = config;
	const listSelector = config.listSelector ?? `[data-${prefix}-list]`;
	const emptySelector = config.emptySelector ?? `[data-${prefix}-empty]`;
	const attr = (action: 'up' | 'down' | 'remove') => `data-${prefix}-${action}`;
	const uploadingLabel = () => root.dataset.labelUploading ?? '';

	let order: A[] = [...config.initialAssets];
	let pending: PendingUpload[] = [];

	function syncOrderInput(): void {
		const input = root.querySelector(`[data-${prefix}-order]`);
		if (input instanceof HTMLInputElement) {
			input.value = order.map((a) => a.id).join(',');
		}
	}

	function swap(index: number, target: number): void {
		if (target < 0 || target >= order.length) return;
		const next = [...order];
		[next[index], next[target]] = [next[target]!, next[index]!];
		order = next;
		render();
	}

	async function removeAsset(assetId: string, button: Element | null): Promise<void> {
		if (!confirm(labels.confirmRemove)) return;
		button?.setAttribute('disabled', 'true');

		try {
			const res = await fetch(`/api/posts/${postId}/assets/${assetId}`, {
				method: 'DELETE',
				credentials: 'same-origin',
			});
			const data = await res.json();
			if (!res.ok) {
				alert(data.error ?? labels.removeFailed);
				button?.removeAttribute('disabled');
				return;
			}
			const removed = order.find((a) => a.id === assetId);
			revokeBlobUrl(removed?.url);
			order = order.filter((a) => a.id !== assetId);
			render();
		} catch {
			alert(labels.removeFailed);
			button?.removeAttribute('disabled');
		}
	}

	function render(): void {
		const list = root.querySelector(listSelector);
		if (!(list instanceof HTMLElement)) return;

		list.innerHTML = '';
		root.querySelector(emptySelector)?.classList.toggle('hidden', order.length + pending.length > 0);

		order.forEach((asset, index) => {
			const item = config.renderItem({ asset, index, total: order.length, labels, attr });
			item.dataset.assetId = asset.id;
			item.querySelector(`[${attr('up')}]`)?.addEventListener('click', () => swap(index, index - 1));
			item.querySelector(`[${attr('down')}]`)?.addEventListener('click', () => swap(index, index + 1));
			item.querySelector(`[${attr('remove')}]`)?.addEventListener('click', () => {
				void removeAsset(asset.id, item.querySelector(`[${attr('remove')}]`));
			});
			list.appendChild(item);
		});

		const renderPending = config.renderPending ?? renderPendingAttachmentRow;
		for (const item of pending) {
			list.appendChild(renderPending(item, uploadingLabel()));
		}

		syncOrderInput();
	}

	render();

	const input = root.querySelector(`[data-${prefix}-upload]`);
	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement)) return;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;

		const busy = config.uploadBusySelector
			? root.querySelector(config.uploadBusySelector)
			: input.closest('label');
		busy?.classList.add('opacity-50', 'pointer-events-none');

		pending = await uploadSelectedFiles(files, pending, {
			postId,
			kind: config.kind,
			multiple: config.multiple,
			labels: {
				uploadFailed: root.dataset.labelUploadFailed ?? '',
				networkError: root.dataset.labelNetworkError ?? '',
				uploading: uploadingLabel(),
			},
			listRoot: root,
			onPendingChange(next) {
				pending = next;
				render();
			},
			toAsset(uploaded, previewUrl) {
				const asset = config.toAsset({
					...uploaded,
					url: previewUrl || uploaded.url,
				});
				order.push(asset);
				render();
			},
		});
		render();

		input.value = '';
		busy?.classList.remove('opacity-50', 'pointer-events-none');
	});

	window.addEventListener('pagehide', () => {
		pending.forEach(revokePendingPreview);
		order.forEach((asset) => revokeBlobUrl(asset.url));
	});

	return {
		append(asset: A) {
			order.push(asset);
			render();
		},
	};
}
