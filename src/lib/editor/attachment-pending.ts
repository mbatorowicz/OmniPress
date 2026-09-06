export type PendingUpload = {
	id: string;
	filename: string;
	previewUrl: string | null;
	progress: number;
	error: string | null;
};

function previewUrlForFile(file: File): string | null {
	if (!file.type.startsWith('image/')) return null;
	if (typeof URL.createObjectURL !== 'function') return null;
	return URL.createObjectURL(file);
}

export function createPendingUpload(file: File): PendingUpload {
	return {
		id: `pending-${crypto.randomUUID()}`,
		filename: file.name,
		previewUrl: previewUrlForFile(file),
		progress: 0,
		error: null,
	};
}

export function revokePendingPreview(item: PendingUpload): void {
	if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
}

export function revokeBlobUrl(url: string | undefined): void {
	if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function renderPendingAttachmentRow(
	pending: PendingUpload,
	uploadingLabel: string,
): HTMLElement {
	const row = document.createElement('li');
	row.className = 'ui-inline-card ui-upload-pending';
	row.dataset.pendingId = pending.id;

	const body = document.createElement('div');
	body.className = 'min-w-0 flex-1 space-y-1';

	const name = document.createElement('p');
	name.className = 'ui-subheading truncate';
	name.textContent = pending.filename;

	const status = document.createElement('p');
	status.className = 'ui-hint';
	status.dataset.uploadStatus = '';
	status.textContent = pending.error ?? `${uploadingLabel} ${pending.progress}%`;

	const meter = document.createElement('progress');
	meter.className = 'ui-upload-meter';
	meter.max = 100;
	meter.value = pending.progress;

	body.append(name, status, meter);
	row.append(body);
	return row;
}

export function renderPendingGalleryCard(
	pending: PendingUpload,
	uploadingLabel: string,
): HTMLElement {
	const card = document.createElement('div');
	card.className = 'ui-gallery-card ui-gallery-card--pending';
	card.dataset.pendingId = pending.id;

	if (pending.previewUrl) {
		const img = document.createElement('img');
		img.src = pending.previewUrl;
		img.alt = pending.filename;
		img.className = 'aspect-[4/3] w-full object-cover';
		card.append(img);
	} else {
		const placeholder = document.createElement('div');
		placeholder.className = 'ui-gallery-pending-placeholder';
		placeholder.setAttribute('aria-hidden', 'true');
		card.append(placeholder);
	}

	const footer = document.createElement('div');
	footer.className = 'ui-gallery-card-footer flex-col items-stretch gap-1';

	const name = document.createElement('span');
	name.className = 'ui-hint truncate';
	name.title = pending.filename;
	name.textContent = pending.filename;

	const status = document.createElement('span');
	status.className = 'ui-hint';
	status.dataset.uploadStatus = '';
	status.textContent = pending.error ?? `${uploadingLabel} ${pending.progress}%`;

	const meter = document.createElement('progress');
	meter.className = 'ui-upload-meter';
	meter.max = 100;
	meter.value = pending.progress;

	footer.append(name, status, meter);
	card.append(footer);
	return card;
}

export function patchPendingProgress(root: HTMLElement, pending: PendingUpload, uploadingLabel: string): void {
	const node = root.querySelector(`[data-pending-id="${pending.id}"]`);
	if (!(node instanceof HTMLElement)) return;
	const status = node.querySelector('[data-upload-status]');
	if (status) status.textContent = pending.error ?? `${uploadingLabel} ${pending.progress}%`;
	const meter = node.querySelector('progress');
	if (meter instanceof HTMLProgressElement) meter.value = pending.progress;
}
