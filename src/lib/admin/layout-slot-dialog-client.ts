/** Otwieranie / zamykanie okien ustawień slotów layoutu. */

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

export function initLayoutSlotDialogs(): void {
	document.querySelectorAll<HTMLDialogElement>('.slot-settings-dialog').forEach((dialog) => {
		const id = dialog.id.replace('slot-dialog-', '');
		dialog.querySelector('.slot-dialog-close')?.addEventListener('click', () => {
			dialog.close();
			refreshSlotCardSummary(id);
		});
	});

	document.querySelectorAll<HTMLButtonElement>('.slot-settings-open').forEach((btn) => {
		btn.addEventListener('click', () => {
			const dialogId = btn.dataset.dialogId;
			if (!dialogId) return;
			const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
			dialog?.showModal();
		});
	});

	document.addEventListener('keydown', (e) => {
		if (e.key !== 'Escape') return;
		document.querySelectorAll<HTMLDialogElement>('.slot-settings-dialog[open]').forEach((dialog) => {
			const id = dialog.id.replace('slot-dialog-', '');
			dialog.close();
			refreshSlotCardSummary(id);
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
