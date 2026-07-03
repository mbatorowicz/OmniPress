import { iconButtonHtml } from '@/lib/ui/button-markup';
import { eventTargetElement } from '@/lib/ui/dom';
import { iconSvg } from '@/lib/ui/icons';

type DocxLabels = {
	remove: string;
	confirmRemove: string;
	removeFailed: string;
};

function readLabels(root: HTMLElement): DocxLabels {
	return {
		remove: root.dataset.labelRemove ?? '',
		confirmRemove: root.dataset.labelConfirmRemove ?? '',
		removeFailed: root.dataset.labelRemoveFailed ?? '',
	};
}

function buildDocxRow(
	asset: { id: string; filename: string; url: string },
	labels: DocxLabels,
): HTMLLIElement {
	const li = document.createElement('li');
	li.className = 'ui-inline-card';
	li.dataset.assetId = asset.id;
	const removeBtn = iconButtonHtml({
		variant: 'iconDanger',
		ariaLabel: labels.remove,
		icon: 'x',
		attrs: { 'data-docx-remove': '' },
	});
	li.innerHTML = `
		<div class="min-w-0 flex-1">
			<p class="ui-subheading flex items-center gap-1.5 truncate">
				<span class="inline-flex shrink-0 ui-muted pointer-events-none">${iconSvg('file-text', 16)}</span>
				<span class="truncate">${asset.filename}</span>
			</p>
			<a href="${asset.url}" target="_blank" rel="noopener noreferrer" class="ui-link text-xs">${asset.url}</a>
		</div>
		${removeBtn}
	`;
	return li;
}

function syncDocxEmptyState(root: HTMLElement): void {
	const list = root.querySelector('[data-docx-list]');
	const empty = root.querySelector('[data-docx-empty]');
	if (!(list instanceof HTMLElement)) return;
	empty?.classList.toggle('hidden', list.children.length > 0);
}

async function removeDocxRow(
	root: HTMLElement,
	li: HTMLElement,
	labels: DocxLabels,
): Promise<void> {
	const postId = root.dataset.postId;
	const assetId = li.dataset.assetId;
	if (!postId || !assetId) return;
	if (!confirm(labels.confirmRemove)) return;

	const btn = li.querySelector('[data-docx-remove]');
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
		syncDocxEmptyState(root);
	} catch {
		alert(labels.removeFailed);
		btn?.removeAttribute('disabled');
	}
}

export function mountDocxAttachments(root: HTMLElement): void {
	const postId = root.dataset.postId;
	const input = root.querySelector('[data-docx-upload]');
	const list = root.querySelector('[data-docx-list]');
	const labels = readLabels(root);

	list?.addEventListener('click', (event) => {
		const target = eventTargetElement(event);
		if (!target) return;
		const btn = target.closest('[data-docx-remove]');
		if (!btn) return;
		const li = btn.closest('li');
		if (!(li instanceof HTMLElement)) return;
		void removeDocxRow(root, li, labels);
	});

	input?.addEventListener('change', async () => {
		if (!(input instanceof HTMLInputElement) || !postId) return;
		const file = input.files?.[0];
		if (!file) return;

		const fd = new FormData();
		fd.append('file', file);
		fd.append('kind', 'docx');

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
			appendDocxRow(root, data.asset, labels);
		} catch {
			alert('Błąd połączenia przy uploadzie.');
		} finally {
			input.value = '';
			btn?.classList.remove('opacity-50', 'pointer-events-none');
		}
	});
}

function appendDocxRow(
	container: HTMLElement,
	asset: { id: string; filename: string; url: string },
	labels: DocxLabels,
): void {
	const ul = container.querySelector('[data-docx-list]');
	if (!(ul instanceof HTMLElement)) return;
	ul.appendChild(buildDocxRow(asset, labels));
	syncDocxEmptyState(container);
}
