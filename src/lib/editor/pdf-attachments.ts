import { iconButtonHtml } from '@/lib/ui/button-markup';
import { eventTargetElement } from '@/lib/ui/dom';
import { iconSvg } from '@/lib/ui/icons';

type PdfLabels = {
	displayLink: string;
	displayEmbed: string;
	remove: string;
	confirmRemove: string;
	removeFailed: string;
};

function readLabels(root: HTMLElement): PdfLabels {
	return {
		displayLink: root.dataset.labelLink ?? '',
		displayEmbed: root.dataset.labelEmbed ?? '',
		remove: root.dataset.labelRemove ?? '',
		confirmRemove: root.dataset.labelConfirmRemove ?? '',
		removeFailed: root.dataset.labelRemoveFailed ?? '',
	};
}

function buildPdfRow(
	asset: { id: string; filename: string; url: string; display_mode?: string },
	labels: PdfLabels,
): HTMLLIElement {
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
		${removeBtn}
	`;
	const labelLink = li.querySelector('[data-label-link]');
	const labelEmbed = li.querySelector('[data-label-embed]');
	if (labelLink) labelLink.textContent = labels.displayLink;
	if (labelEmbed) labelEmbed.textContent = labels.displayEmbed;
	return li;
}

function syncPdfEmptyState(root: HTMLElement): void {
	const list = root.querySelector('[data-pdf-list]');
	const empty = root.querySelector('[data-pdf-empty]');
	if (!(list instanceof HTMLElement)) return;
	empty?.classList.toggle('hidden', list.children.length > 0);
}

async function removePdfRow(
	root: HTMLElement,
	li: HTMLElement,
	labels: PdfLabels,
): Promise<void> {
	const postId = root.dataset.postId;
	const assetId = li.dataset.assetId;
	if (!postId || !assetId) return;
	if (!confirm(labels.confirmRemove)) return;

	const btn = li.querySelector('[data-pdf-remove]');
	btn?.setAttribute('disabled', 'true');

	try {
		const res = await fetch(`/api/posts/${postId}/assets/${assetId}`, {
			method: 'DELETE',
			credentials: 'same-origin',
		});
		const data = await res.json();
		if (!res.ok) {
			alert(data.error ?? labels.removeFailed);
			btn?.removeAttribute('disabled');
			return;
		}
		li.remove();
		syncPdfEmptyState(root);
	} catch {
		alert(labels.removeFailed);
		btn?.removeAttribute('disabled');
	}
}

export function mountPdfAttachments(root: HTMLElement): void {
	const postId = root.dataset.postId;
	const input = root.querySelector('[data-pdf-upload]');
	const list = root.querySelector('[data-pdf-list]');
	const labels = readLabels(root);

	list?.addEventListener('click', (event) => {
		const target = eventTargetElement(event);
		if (!target) return;
		const btn = target.closest('[data-pdf-remove]');
		if (!btn) return;
		const li = btn.closest('li');
		if (!(li instanceof HTMLElement)) return;
		void removePdfRow(root, li, labels);
	});

	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement) || !postId) return;
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
			appendPdfRow(root, data.asset, labels);
		} catch {
			alert('Błąd połączenia przy uploadzie.');
		} finally {
			input.value = '';
			btn?.classList.remove('opacity-50', 'pointer-events-none');
		}
	});
}

function appendPdfRow(
	container: HTMLElement,
	asset: { id: string; filename: string; url: string; display_mode?: string },
	labels: PdfLabels,
): void {
	const ul = container.querySelector('[data-pdf-list]');
	if (!(ul instanceof HTMLElement)) return;
	ul.appendChild(buildPdfRow(asset, labels));
	syncPdfEmptyState(container);
}
