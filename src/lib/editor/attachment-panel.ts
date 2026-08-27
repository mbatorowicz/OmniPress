/**
 * Wspólny mechanizm paneli załączników (galeria, PDF, DOCX, pliki do pobrania):
 * kolejność, przenoszenie, usuwanie, upload. Różni je wyłącznie markup wiersza —
 * dostarcza go `renderItem`.
 */
import { uploadPostAsset, type UploadedAsset } from '@/lib/editor/upload-asset';

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
	/** Nazwa atrybutu sterującego, np. `data-pdf-up` — wiersz musi ją wystawić. */
	attr: (action: 'up' | 'down' | 'remove') => string;
};

export type AttachmentPanelConfig<A extends AttachmentAsset, L extends AttachmentPanelLabels> = {
	/** Prefiks atrybutów `data-*` panelu, np. `pdf` → `data-pdf-list`, `data-pdf-order`. */
	prefix: string;
	kind: Parameters<typeof uploadPostAsset>[2];
	labels: L;
	initialAssets: A[];
	renderItem: (ctx: AttachmentItemContext<A, L>) => HTMLElement;
	/** Kontener listy; domyślnie `[data-{prefix}-list]`. */
	listSelector?: string;
	/** Element „brak załączników"; domyślnie `[data-{prefix}-empty]`. */
	emptySelector?: string;
	/** Element wygaszany na czas uploadu; domyślnie `<label>` opakowujący input. */
	uploadBusySelector?: string;
	/** Galeria przyjmuje wiele plików naraz. */
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

	let order: A[] = [...config.initialAssets];

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
		root.querySelector(emptySelector)?.classList.toggle('hidden', order.length > 0);

		order.forEach((asset, index) => {
			const item = config.renderItem({ asset, index, total: order.length, labels, attr });
			item.dataset.assetId = asset.id;

			item.querySelector(`[${attr('up')}]`)?.addEventListener('click', () => swap(index, index - 1));
			item
				.querySelector(`[${attr('down')}]`)
				?.addEventListener('click', () => swap(index, index + 1));
			item.querySelector(`[${attr('remove')}]`)?.addEventListener('click', () => {
				void removeAsset(asset.id, item.querySelector(`[${attr('remove')}]`));
			});

			list.appendChild(item);
		});

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

		const uploadLabels = {
			uploadFailed: root.dataset.labelUploadFailed ?? '',
			networkError: root.dataset.labelNetworkError ?? '',
		};

		for (const file of config.multiple ? files : files.slice(0, 1)) {
			const result = await uploadPostAsset(postId, file, config.kind, uploadLabels);
			if (!result.ok) {
				alert(result.error || `${uploadLabels.uploadFailed}: ${file.name}`);
				continue;
			}
			order.push(config.toAsset(result.asset));
		}
		render();

		input.value = '';
		busy?.classList.remove('opacity-50', 'pointer-events-none');
	});

	return {
		append(asset: A) {
			order.push(asset);
			render();
		},
	};
}
