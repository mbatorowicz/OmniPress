/** Otwieranie / zamykanie okien ustawień slotów layoutu. */

let slotDialogsBound = false;

export function refreshSlotCardSummary(slotId: string): void {
	const card = document.querySelector<HTMLElement>(`.layout-slot-card[data-slot-id="${slotId}"]`);
	const panel = document.getElementById(`slot-panel-${slotId}`);
	const summaryEl = card?.querySelector(`[data-slot-summary="${slotId}"]`);
	if (!card || !panel || !summaryEl) return;

	const chips: string[] = [];
	const enabled = card.querySelector<HTMLInputElement>('.slot-card-enabled')?.checked !== false;
	if (!enabled) {
		chips.push('<span class="layout-slot-chip layout-slot-chip--muted">wyłączony</span>');
	}

	panel.querySelectorAll('.home-feed-categories-field input[type="checkbox"]:checked').forEach((input) => {
		const label = input.closest('label');
		const name = label?.querySelector('span')?.childNodes[0]?.textContent?.trim();
		if (name) chips.push(`<span class="layout-slot-chip">Kategorie: ${name}</span>`);
	});

	const linkType =
		(panel.querySelector('.slot-banner-link-type') as HTMLSelectElement | null)?.value ?? '';
	if (linkType === 'category') {
		const sel = panel.querySelector('.slot-banner-field-category select') as HTMLSelectElement | null;
		const text = sel?.selectedOptions[0]?.textContent?.trim();
		if (text && text !== '—') chips.push(`<span class="layout-slot-chip">Link: ${text}</span>`);
	} else if (linkType === 'page') {
		const sel = panel.querySelector('.slot-banner-field-page select') as HTMLSelectElement | null;
		const val = sel?.value;
		if (val) chips.push(`<span class="layout-slot-chip">Link: ${val}</span>`);
	} else if (linkType === 'external') {
		const url = (panel.querySelector('.slot-banner-field-external input') as HTMLInputElement | null)?.value?.trim();
		if (url) chips.push(`<span class="layout-slot-chip">Link: ${url}</span>`);
	}

	const topbarText = (panel.querySelector('input[name*="topbar"]') as HTMLInputElement | null)?.value?.trim();
	if (topbarText) chips.push(`<span class="layout-slot-chip">${topbarText}</span>`);

	summaryEl.innerHTML = chips.join('');
}

function slotIdFromDialog(dialog: HTMLDialogElement): string | null {
	if (!dialog.id.startsWith('slot-dialog-')) return null;
	return dialog.id.slice('slot-dialog-'.length);
}

function closeSlotSettingsDialog(dialog: HTMLDialogElement): void {
	dialog.close();
	const slotId = slotIdFromDialog(dialog);
	if (slotId) refreshSlotCardSummary(slotId);
}

export function initLayoutSlotDialogs(): void {
	if (slotDialogsBound) return;
	slotDialogsBound = true;

	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;

		const openBtn = target.closest('.slot-settings-open');
		if (openBtn instanceof HTMLButtonElement) {
			const dialogId = openBtn.dataset.dialogId;
			if (!dialogId) return;
			event.preventDefault();
			const dialog = document.getElementById(dialogId);
			if (dialog instanceof HTMLDialogElement) {
				dialog.showModal();
			}
			return;
		}

		const closeBtn = target.closest('.slot-dialog-close');
		if (closeBtn) {
			const dialog = closeBtn.closest('dialog.slot-settings-dialog');
			if (dialog instanceof HTMLDialogElement) {
				event.preventDefault();
				closeSlotSettingsDialog(dialog);
			}
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		document.querySelectorAll<HTMLDialogElement>('.slot-settings-dialog[open]').forEach((dialog) => {
			if (dialog.id === 'component-add-dialog') return;
			closeSlotSettingsDialog(dialog);
		});
	});
}

export function bindSlotCardLabelSync(card: HTMLElement): void {
	const labelInput = card.querySelector<HTMLInputElement>('.slot-card-label-input');
	const row = document.querySelector<HTMLElement>(`.slot-row[data-slot-id="${card.dataset.slotId}"]`);
	const rowLabel = row?.querySelector<HTMLInputElement>('input[name="slot_label"]');
	if (labelInput && rowLabel) {
		rowLabel.addEventListener('input', () => {
			labelInput.value = rowLabel.value;
			const display = card.querySelector('.layout-slot-card__label');
			if (display) display.textContent = rowLabel.value || labelInput.value;
		});
	}
}
