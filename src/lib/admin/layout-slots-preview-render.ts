import { swapAdjacentOrders } from '@/lib/astro-layout/slots';
import { stepButtonHtml } from '@/lib/ui/button-markup';
import {
	buildContentChip,
	escapeHtml,
	HIGHLIGHT_CLASS,
	PANEL_HIGHLIGHT_CLASS,
	readSlotRows,
	sortByOrder,
	writeOrderInput,
	type LayoutSlotsPreviewConfig,
	type SlotRowData,
} from './layout-slots-preview-read';

function highlightSlot(slot: SlotRowData): void {
	const slotsBody = slot.row.closest('#slots-body');
	slotsBody?.querySelectorAll('.slot-row').forEach((tr) => tr.classList.remove(HIGHLIGHT_CLASS));
	slot.row.classList.add(HIGHLIGHT_CLASS);

	const dialog = document.getElementById(`slot-dialog-${slot.id}`) as HTMLDialogElement | null;
	if (dialog) {
		dialog.showModal();
		return;
	}

	document.querySelectorAll('.slot-config-panel').forEach((panel) => {
		panel.classList.remove(PANEL_HIGHLIGHT_CLASS);
	});
	const detail = document.getElementById(`slot-panel-${slot.id}`);
	detail?.classList.add(PANEL_HIGHLIGHT_CLASS);
	(detail ?? slot.row).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function buildCardHtml(
	slot: SlotRowData,
	index: number,
	total: number,
	config: LayoutSlotsPreviewConfig,
): string {
	const componentLabel = escapeHtml(config.componentLabels[slot.component] ?? slot.component);
	const safeLabel = escapeHtml(slot.label);
	const disabledBadge = slot.enabled
		? ''
		: `<span class="slot-preview-disabled-badge">${escapeHtml(config.disabledLabel)}</span>`;
	const contentChip = buildContentChip(slot, config);
	return `
		<div class="slot-preview-card" data-slot-id="${escapeHtml(slot.id)}" role="button" tabindex="0">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 flex-1">
					<p class="ui-subheading truncate">${safeLabel}${disabledBadge}</p>
					<p class="ui-hint truncate">${componentLabel}</p>
					${contentChip}
				</div>
				<div class="flex shrink-0 gap-1">
					${stepButtonHtml({ ariaLabel: config.moveUp, label: '↑', disabled: index === 0, className: 'slot-preview-up' })}
					${stepButtonHtml({ ariaLabel: config.moveDown, label: '↓', disabled: index === total - 1, className: 'slot-preview-down' })}
				</div>
			</div>
		</div>
	`;
}

function renderZone(
	container: HTMLElement,
	slots: SlotRowData[],
	config: LayoutSlotsPreviewConfig,
	onReorder: () => void,
): void {
	container.innerHTML = '';
	if (slots.length === 0) {
		const empty = document.createElement('p');
		empty.className = 'slot-preview-empty';
		empty.textContent = config.emptyZone;
		container.appendChild(empty);
		return;
	}

	slots.forEach((slot, index) => {
		const wrapper = document.createElement('div');
		wrapper.innerHTML = buildCardHtml(slot, index, slots.length, config);
		const card = wrapper.firstElementChild as HTMLElement;

		card.querySelector('.slot-preview-up')?.addEventListener('click', (event) => {
			event.stopPropagation();
			if (index <= 0) return;
			const prev = slots[index - 1]!;
			const [newPrevOrder, newOrder] = swapAdjacentOrders(prev.order, slot.order);
			writeOrderInput(prev.row, newPrevOrder);
			writeOrderInput(slot.row, newOrder);
			onReorder();
		});

		card.querySelector('.slot-preview-down')?.addEventListener('click', (event) => {
			event.stopPropagation();
			if (index >= slots.length - 1) return;
			const next = slots[index + 1]!;
			const [newOrder, newNextOrder] = swapAdjacentOrders(slot.order, next.order);
			writeOrderInput(slot.row, newOrder);
			writeOrderInput(next.row, newNextOrder);
			onReorder();
		});

		const activate = () => highlightSlot(slot);
		card.addEventListener('click', activate);
		card.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				activate();
			}
		});

		container.appendChild(card);
	});
}

let previewConfig: LayoutSlotsPreviewConfig | null = null;

export function refreshLayoutSlotsPreview(): void {
	if (!previewConfig) return;
	const slotsBody = document.getElementById('slots-body');
	const homeZone = document.getElementById('slots-preview-home');
	const sidebarZone = document.getElementById('slots-preview-sidebar');
	if (!(slotsBody instanceof HTMLElement) || !(homeZone instanceof HTMLElement) || !(sidebarZone instanceof HTMLElement)) {
		return;
	}

	const all = readSlotRows(slotsBody);
	const homeSlots = sortByOrder(all.filter((s) => s.area === 'home'));
	const sidebarSlots = sortByOrder(all.filter((s) => s.area === 'sidebar'));

	const refresh = () => refreshLayoutSlotsPreview();
	renderZone(homeZone, homeSlots, previewConfig, refresh);
	renderZone(sidebarZone, sidebarSlots, previewConfig, refresh);
}

export function initLayoutSlotsPreview(config: LayoutSlotsPreviewConfig): void {
	previewConfig = config;
	const slotsBody = document.getElementById('slots-body');
	const slotsByZone = document.getElementById('slots-by-zone');
	if (!(slotsBody instanceof HTMLElement)) return;

	refreshLayoutSlotsPreview();

	slotsBody.addEventListener('input', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (
			target.matches('input[name="slot_label"], input[name="slot_widget_order"], .slot-component')
		) {
			refreshLayoutSlotsPreview();
		}
	});

	slotsBody.addEventListener('change', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.matches('.slot-component, input[type="checkbox"][name^="slot_enabled_"]')) {
			refreshLayoutSlotsPreview();
		}
	});

	slotsByZone?.addEventListener('change', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (
			target.matches(
				'.home-feed-categories-field input, .slot-banner-link-type, .slot-banner-field-category select, .slot-banner-field-page select, .slot-banner-field-external input, select[name*="category_filter"]',
			)
		) {
			refreshLayoutSlotsPreview();
		}
	});

	slotsByZone?.addEventListener('input', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.matches('.slot-banner-field-external input')) {
			refreshLayoutSlotsPreview();
		}
	});
}
