import { swapAdjacentOrders } from '@/lib/astro-layout/slots';

export interface LayoutSlotsPreviewConfig {
	componentLabels: Record<string, string>;
	moveUp: string;
	moveDown: string;
	disabledLabel: string;
	emptyZone: string;
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

function highlightRow(row: HTMLElement): void {
	const slotsBody = row.closest('#slots-body');
	const slotId = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim();
	slotsBody?.querySelectorAll('.slot-row').forEach((tr) => tr.classList.remove(HIGHLIGHT_CLASS));
	row.classList.add(HIGHLIGHT_CLASS);
	const detail = slotId
		? document.querySelector(`.slot-detail-block[data-slot-id="${slotId}"]`)
		: null;
	(detail ?? row).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
		: `<span class="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">${escapeHtml(config.disabledLabel)}</span>`;
	return `
		<div class="slot-preview-card rounded border border-slate-200 bg-slate-50 p-2 shadow-sm" data-slot-id="${escapeHtml(slot.id)}" role="button" tabindex="0">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-slate-800">${safeLabel}${disabledBadge}</p>
					<p class="truncate text-xs text-slate-500">${componentLabel}</p>
				</div>
				<div class="flex shrink-0 gap-1">
					<button type="button" class="slot-preview-up rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs hover:bg-slate-100" ${index === 0 ? 'disabled' : ''} aria-label="${config.moveUp}">↑</button>
					<button type="button" class="slot-preview-down rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs hover:bg-slate-100" ${index === total - 1 ? 'disabled' : ''} aria-label="${config.moveDown}">↓</button>
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
		empty.className = 'text-sm text-slate-400 italic';
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

		const activate = () => highlightRow(slot.row);
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
}
