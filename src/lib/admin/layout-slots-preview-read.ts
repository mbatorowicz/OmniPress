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

export type SlotArea = 'home' | 'sidebar';

export interface SlotRowData {
	row: HTMLElement;
	id: string;
	label: string;
	component: string;
	order: number;
	enabled: boolean;
	area: SlotArea;
}

export const HIGHLIGHT_CLASS = 'slot-row--highlighted';
export const PANEL_HIGHLIGHT_CLASS = 'slot-config-panel--highlighted';

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function readOrderInput(row: HTMLElement, fallbackIndex: number): number {
	const input = row.querySelector('input[name="slot_widget_order"]') as HTMLInputElement | null;
	const n = Number(input?.value);
	if (Number.isFinite(n) && n >= 0) return n;
	return (fallbackIndex + 1) * 10;
}

export function writeOrderInput(row: HTMLElement, order: number): void {
	const input = row.querySelector('input[name="slot_widget_order"]') as HTMLInputElement | null;
	if (input) input.value = String(order);
}

export function readSlotArea(component: string): SlotArea {
	return component.startsWith('sidebar.') ? 'sidebar' : 'home';
}

export function readSlotRows(slotsBody: HTMLElement): SlotRowData[] {
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

export function sortByOrder(slots: SlotRowData[]): SlotRowData[] {
	return [...slots].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.id.localeCompare(b.id);
	});
}

export function readSelectedCategoryNames(slotId: string): string[] {
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

export function readBannerLinkSummary(slotId: string): string {
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

export function readCertFilterSummary(slotId: string): string {
	const panel = document.getElementById(`slot-panel-${slotId}`);
	if (!panel) return '';
	const select = panel.querySelector('select[name*="slot_cert_category"]') as HTMLSelectElement | null;
	return select?.selectedOptions[0]?.textContent?.trim() ?? '';
}

export function buildContentChip(slot: SlotRowData, config: LayoutSlotsPreviewConfig): string {
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
