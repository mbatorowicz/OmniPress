import { swapAdjacentOrders } from '@/lib/astro-layout/slots';
import { stepButtonHtml } from '@/lib/ui/button-markup';

export interface LayoutSlotsPreviewConfig {
	componentLabels: Record<string, string>;
	moveUp: string;
	moveDown: string;
	disabledLabel: string;
	emptyZone: string;
	chipNoCategories: string;
	chipCategoriesPrefix: string;
	chipPinnedOnly: string;
	chipLinkPrefix: string;
}

type SlotArea = 'home' | 'sidebar';

interface SlotRowData {
	row: HTMLElement;
	id: string;
	label: string;
	component: string;
	order: number;
	enabled: boolean;
	area: SlotArea;
}

const HIGHLIGHT_CLASS = 'slot-row--highlighted';
const PANEL_HIGHLIGHT_CLASS = 'slot-config-panel--highlighted';

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function readOrderInput(row: HTMLElement, fallbackIndex: number): number {
	const input = row.querySelector('input[name="slot_widget_order"]') as HTMLInputElement | null;
	const n = Number(input?.value);
	if (Number.isFinite(n) && n >= 0) return n;
	return (fallbackIndex + 1) * 10;
}

function writeOrderInput(row: HTMLElement, order: number): void {
	const input = row.querySelector('input[name="slot_widget_order"]') as HTMLInputElement | null;
	if (input) input.value = String(order);
}

function readSlotArea(component: string): SlotArea {
	return component.startsWith('sidebar.') ? 'sidebar' : 'home';
}

function readSlotRows(slotsBody: HTMLElement): SlotRowData[] {
	const rows = [...slotsBody.querySelectorAll('.slot-row')] as HTMLElement[];
	return rows
		.map((row, index) => {
			const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim() ?? '';
			const label =
				(row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim() || id;
			const component = (row.querySelector('.slot-component') as HTMLSelectElement | null)?.value ?? '';
			const enabledInput = row.querySelector(
				'input[type="checkbox"][name^="slot_enabled_"]',
			) as HTMLInputElement | null;
			const enabled = enabledInput?.checked !== false;
			if (!id || !component) return null;
			return {
				row,
				id,
				label,
				component,
				order: readOrderInput(row, index),
				enabled,
				area: readSlotArea(component),
			};
		})
		.filter((slot): slot is SlotRowData => slot !== null);
}

function sortByOrder(slots: SlotRowData[]): SlotRowData[] {
	return [...slots].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.id.localeCompare(b.id);
	});
}

function readSelectedCategoryNames(slotId: string): string[] {
	const panel = document.getElementById(`slot-panel-${slotId}`);
	if (!panel) return [];
	const names: string[] = [];
	panel.querySelectorAll('.home-feed-categories-field input[type="checkbox"]').forEach((input) => {
		const checkbox = input as HTMLInputElement;
		if (!checkbox.checked) return;
		const label = checkbox.closest('label');
		const name = label?.querySelector('span')?.childNodes[0]?.textContent?.trim();
		if (name) names.push(name);
	});
	return names;
}

function readBannerLinkSummary(slotId: string): string {
	const panel = document.getElementById(`slot-panel-${slotId}`);
	if (!panel) return '';
	const linkType =
		(panel.querySelector('.slot-banner-link-type') as HTMLSelectElement | null)?.value ?? 'category';
	if (linkType === 'category') {
		const select = panel.querySelector('.slot-banner-field-category select') as HTMLSelectElement | null;
		const text = select?.selectedOptions[0]?.textContent?.trim();
		return text && text !== '—' ? text : '';
	}
	if (linkType === 'page') {
		const select = panel.querySelector('.slot-banner-field-page select') as HTMLSelectElement | null;
		return select?.selectedOptions[0]?.textContent?.trim() ?? '';
	}
	const input = panel.querySelector('.slot-banner-field-external input') as HTMLInputElement | null;
	return input?.value?.trim() ?? '';
}

function readCertFilterSummary(slotId: string): string {
	const panel = document.getElementById(`slot-panel-${slotId}`);
	if (!panel) return '';
	const select = panel.querySelector('select[name*="slot_cert_category"]') as HTMLSelectElement | null;
	return select?.selectedOptions[0]?.textContent?.trim() ?? '';
}

function buildContentChip(slot: SlotRowData, config: LayoutSlotsPreviewConfig): string {
	if (slot.component === 'home.pinned' || slot.component === 'home.latest') {
		const names = readSelectedCategoryNames(slot.id);
		const categoriesText =
			names.length > 0
				? `${config.chipCategoriesPrefix} ${names.join(', ')}`
				: config.chipNoCategories;
		const pinned =
			slot.component === 'home.pinned'
				? `<span class="slot-preview-chip slot-preview-chip--muted">${escapeHtml(config.chipPinnedOnly)}</span>`
				: '';
		return `<p class="slot-preview-chips"><span class="slot-preview-chip">${escapeHtml(categoriesText)}</span>${pinned}</p>`;
	}
	if (slot.component === 'sidebar.banner') {
		const link = readBannerLinkSummary(slot.id);
		if (!link) return '';
		return `<p class="slot-preview-chips"><span class="slot-preview-chip">${escapeHtml(config.chipLinkPrefix)} ${escapeHtml(link)}</span></p>`;
	}
	if (slot.component === 'sidebar.cert_advisories') {
		const filter = readCertFilterSummary(slot.id);
		if (!filter) return '';
		return `<p class="slot-preview-chips"><span class="slot-preview-chip">${escapeHtml(filter)}</span></p>`;
	}
	return '';
}

function highlightSlot(slot: SlotRowData): void {
	const slotsBody = slot.row.closest('#slots-body');
	slotsBody?.querySelectorAll('.slot-row').forEach((tr) => tr.classList.remove(HIGHLIGHT_CLASS));
	slot.row.classList.add(HIGHLIGHT_CLASS);

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
