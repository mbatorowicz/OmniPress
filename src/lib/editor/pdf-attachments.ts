export function mountPdfAttachments(root: HTMLElement): void {
	const postId = root.dataset.postId;
	const input = root.querySelector('[data-pdf-upload]');
	const list = root.querySelector('[data-pdf-list]');

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
			appendPdfRow(root, data.asset);
		} catch {
			alert('Błąd połączenia przy uploadzie.');
		} finally {
			input.value = '';
			btn?.classList.remove('opacity-50', 'pointer-events-none');
		}
	});

	function appendPdfRow(
		container: HTMLElement,
		asset: { id: string; filename: string; url: string; display_mode?: string },
	): void {
		container.querySelector('[data-pdf-empty]')?.classList.add('hidden');
		const ul = container.querySelector('[data-pdf-list]');
		if (!(ul instanceof HTMLElement)) return;

		const li = document.createElement('li');
		li.className =
			'flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2';
		li.innerHTML = `
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-slate-800">📄 ${asset.filename}</p>
				<a href="${asset.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-brand hover:underline">${asset.url}</a>
			</div>
			<fieldset class="flex shrink-0 flex-col gap-1 text-xs text-slate-600">
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="asset_mode_${asset.id}" value="link" class="text-brand" ${asset.display_mode !== 'embed' ? 'checked' : ''} />
					<span data-label-link></span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="asset_mode_${asset.id}" value="embed" class="text-brand" ${asset.display_mode === 'embed' ? 'checked' : ''} />
					<span data-label-embed></span>
				</label>
			</fieldset>
		`;
		const labelLink = li.querySelector('[data-label-link]');
		const labelEmbed = li.querySelector('[data-label-embed]');
		if (labelLink) labelLink.textContent = container.dataset.labelLink ?? 'Link';
		if (labelEmbed) labelEmbed.textContent = container.dataset.labelEmbed ?? 'Podgląd';
		ul.appendChild(li);
	}
}
