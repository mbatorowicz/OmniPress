import { getComponentZone, isSingletonComponent, type LayoutZone } from '@/lib/astro-layout/components';
import {
	bindSlotCardLabelSync,
	initLayoutSlotDialogs,
	refreshSlotCardSummary,
} from '@/lib/admin/layout-slot-dialog-client';
import { refreshLayoutSlotsPreview } from '@/lib/admin/layout-slots-preview-client';
import {
	buildDetailHtml,
	buildSlotCardHtml,
	buildSlotDialogShellHtml,
	componentToKind,
	type LayoutComponentKind,
	type SectionBuildConfig,
} from '@/lib/admin/layout-slots-sections';

export interface LayoutSlotsClientConfig extends SectionBuildConfig {
	removeSlotLabel: string;
	componentOptionsHtml: string;
	singletonComponents: string[];
	settingsLabel: string;
	closeLabel: string;
	disabledLabel: string;
}

function nextSlotOrder(slotsBody: HTMLElement): number {
	let max = 0;
	slotsBody.querySelectorAll('input[name="slot_widget_order"]').forEach((input) => {
		const n = Number((input as HTMLInputElement).value);
		if (Number.isFinite(n) && n > max) max = n;
	});
	return max > 0 ? max + 10 : 10;
}

function usedSingletons(slotsBody: HTMLElement, singletonComponents: string[]): Set<string> {
	const used = new Set<string>();
	slotsBody.querySelectorAll('.slot-component').forEach((sel) => {
		const value = (sel as HTMLSelectElement).value;
		if (singletonComponents.includes(value)) used.add(value);
	});
	slotsBody.querySelectorAll('.layout-slot-card').forEach((card) => {
		const component = (card as HTMLElement).dataset.component ?? '';
		if (singletonComponents.includes(component)) used.add(component);
	});
	return used;
}

function syncBannerSubfields(block: HTMLElement): void {
	const style = (block.querySelector('.slot-banner-style') as HTMLSelectElement | null)?.value ?? 'image';
	const linkType = (block.querySelector('.slot-banner-link-type') as HTMLSelectElement | null)?.value ?? 'category';
	block.querySelectorAll('.slot-banner-field-image').forEach((el) => {
		el.classList.toggle('hidden', style !== 'image');
	});
	block.querySelectorAll('.slot-banner-field-text').forEach((el) => {
		el.classList.toggle('hidden', style !== 'text');
	});
	block.querySelectorAll('.slot-banner-field-category').forEach((el) => {
		el.classList.toggle('hidden', linkType !== 'category');
	});
	block.querySelectorAll('.slot-banner-field-page').forEach((el) => {
		el.classList.toggle('hidden', linkType !== 'page');
	});
	block.querySelectorAll('.slot-banner-field-external').forEach((el) => {
		el.classList.toggle('hidden', linkType !== 'external');
	});
}

function bindBannerBlock(block: HTMLElement): void {
	block.querySelector('.slot-banner-style')?.addEventListener('change', () => syncBannerSubfields(block));
	block.querySelector('.slot-banner-link-type')?.addEventListener('change', () => syncBannerSubfields(block));
	syncBannerSubfields(block);
}

function readRowSlot(row: HTMLElement): { id: string; label: string; component: string } | null {
	const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim() ?? '';
	const label = (row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim() ?? '';
	const component = (row.querySelector('.slot-component') as HTMLSelectElement | null)?.value ?? '';
	if (!id || !component) return null;
	return { id, label: label || id, component };
}

function zoneCardsContainer(zone: LayoutZone): HTMLElement | null {
	return document.getElementById(`zone-${zone}-cards`);
}

function removeSlotUi(slotId: string): void {
	document.getElementById(`slot-dialog-${slotId}`)?.remove();
	document.querySelector(`.layout-slot-card[data-slot-id="${slotId}"]`)?.remove();
	document.getElementById(`slot-panel-${slotId}`)?.remove();
}

function appendSlotUi(
	kind: LayoutComponentKind,
	id: string,
	label: string,
	component: string,
	order: number,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	const zone = getComponentZone(component);
	if (!zone) return;

	const panelHtml = buildDetailHtml(kind, id, label, component, sectionConfig);
	const componentLabel = config.componentLabels[component] ?? component;
	const cardHtml = buildSlotCardHtml(id, label, component, {
		componentLabels: config.componentLabels,
		settingsLabel: config.settingsLabel,
		disabledLabel: config.disabledLabel,
		order,
	});
	const dialogHtml = buildSlotDialogShellHtml(
		id,
		`${config.settingsLabel} — ${componentLabel}`,
		config.closeLabel,
		panelHtml,
	);

	const cardsContainer = zoneCardsContainer(zone);
	if (cardsContainer) {
		const emptyHint = cardsContainer.querySelector('.ui-hint');
		emptyHint?.remove();
		const cardWrap = document.createElement('div');
		cardWrap.innerHTML = cardHtml + dialogHtml;
		const card = cardWrap.querySelector('.layout-slot-card') as HTMLElement;
		const dialog = cardWrap.querySelector('.slot-settings-dialog') as HTMLDialogElement;
		if (card) {
			cardsContainer.appendChild(card);
			bindSlotCardLabelSync(card);
		}
		if (dialog) cardsContainer.appendChild(dialog);
	}

	const panel = document.getElementById(`slot-panel-${id}`);
	if (panel && kind === 'banner') bindBannerBlock(panel);
}

function buildListRowHtml(
	config: LayoutSlotsClientConfig,
	id: string,
	order: number,
	component: string,
	label = '',
): string {
	const isSingleton = isSingletonComponent(component);
	const componentCell = isSingleton
		? `<input type="hidden" name="slot_component" value="${component}" /><span class="text-sm">${config.componentLabels[component] ?? component}</span>`
		: `<select name="slot_component" class="slot-component ui-select-compact w-48">${config.componentOptionsHtml}</select>`;
	const idReadonly = isSingleton ? 'readonly' : '';
	return `
		<td class="ui-table-dense-td"><input name="slot_id" value="${id}" required ${idReadonly} class="ui-input-compact ui-input-compact--mono w-24" /></td>
		<td class="ui-table-dense-td"><input name="slot_label" value="${label}" required class="ui-input-compact w-32 slot-row-label" /></td>
		<td class="ui-table-dense-td">${componentCell}</td>
		<td class="ui-table-dense-td"><input name="slot_widget_order" type="number" min="0" value="${order}" class="ui-input-compact w-16 slot-row-order" /></td>
		<td class="ui-table-dense-td text-center"><input type="checkbox" name="slot_enabled_${id}" checked class="slot-row-enabled" /></td>
		<td class="ui-table-dense-td">${isSingleton ? '' : `<button type="button" class="remove-slot ui-btn ui-btn--link-danger">${config.removeSlotLabel}</button>`}</td>
	`;
}

function syncDetailForRow(
	row: HTMLElement,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	const slot = readRowSlot(row);
	if (!slot) return;
	const kind = componentToKind(slot.component);
	removeSlotUi(slot.id);
	if (!kind) return;
	const order = Number((row.querySelector('.slot-row-order') as HTMLInputElement | null)?.value) || 10;
	appendSlotUi(kind, slot.id, slot.label, slot.component, order, config, sectionConfig);
	initLayoutSlotDialogs();
}

function addSlot(component: string, config: LayoutSlotsClientConfig, sectionConfig: SectionBuildConfig): void {
	const slotsBody = document.getElementById('slots-body');
	if (!(slotsBody instanceof HTMLElement)) return;

	if (
		config.singletonComponents.includes(component) &&
		usedSingletons(slotsBody, config.singletonComponents).has(component)
	) {
		return;
	}

	const kind = componentToKind(component);
	if (!kind) return;

	const id = `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	const order = nextSlotOrder(slotsBody);
	const defaultLabel = config.componentLabels[component] ?? component;

	const tr = document.createElement('tr');
	tr.className = 'slot-row ui-table-dense-row';
	tr.dataset.slotId = id;
	tr.innerHTML = buildListRowHtml(config, id, order, component, defaultLabel);
	const compSelect = tr.querySelector('.slot-component') as HTMLSelectElement | null;
	if (compSelect) compSelect.value = component;
	slotsBody.appendChild(tr);

	appendSlotUi(kind, id, defaultLabel, component, order, config, sectionConfig);
	bindSlotRow(tr, config, sectionConfig);
	initLayoutSlotDialogs();
	refreshLayoutSlotsPreview();
}

function bindSlotRow(row: HTMLElement, config: LayoutSlotsClientConfig, sectionConfig: SectionBuildConfig): void {
	const slot = readRowSlot(row);
	const panel = slot ? document.getElementById(`slot-panel-${slot.id}`) : null;
	if (panel && componentToKind(slot?.component ?? '') === 'banner') bindBannerBlock(panel);

	row.querySelector('.slot-component')?.addEventListener('change', () => {
		syncDetailForRow(row, config, sectionConfig);
		refreshLayoutSlotsPreview();
	});

	row.querySelector('.remove-slot')?.addEventListener('click', () => {
		const s = readRowSlot(row);
		if (s) removeSlotUi(s.id);
		row.remove();
		refreshLayoutSlotsPreview();
	});

	row.querySelector('.slot-row-order')?.addEventListener('change', () => {
		const s = readRowSlot(row);
		if (!s) return;
		const card = document.querySelector<HTMLElement>(`.layout-slot-card[data-slot-id="${s.id}"]`);
		const orderInput = card?.querySelector<HTMLInputElement>('.slot-card-order-input');
		const orderVal = (row.querySelector('.slot-row-order') as HTMLInputElement | null)?.value;
		if (orderInput && orderVal) orderInput.value = orderVal;
	});

	row.querySelector('.slot-row-label')?.addEventListener('input', () => {
		const s = readRowSlot(row);
		if (!s) return;
		const card = document.querySelector<HTMLElement>(`.layout-slot-card[data-slot-id="${s.id}"]`);
		const labelInput = card?.querySelector<HTMLInputElement>('.slot-card-label-input');
		const display = card?.querySelector('.layout-slot-card__label');
		const val = (row.querySelector('.slot-row-label') as HTMLInputElement | null)?.value ?? '';
		if (labelInput) labelInput.value = val;
		if (display) display.textContent = val || s.id;
	});
}

export function initLayoutSlotsTable(config: LayoutSlotsClientConfig): void {
	const slotsBody = document.getElementById('slots-body');
	const addSlotBtn = document.getElementById('add-slot');
	const addComponentSelect = document.getElementById('add-slot-component');
	const categoryOptionsTpl = document.getElementById('slot-banner-category-options');
	const pageOptionsTpl = document.getElementById('slot-banner-page-options');
	const certOptionsTpl = document.getElementById('slot-cert-category-options');
	const homeFeedCategoriesTpl = document.getElementById('slot-home-feed-category-checkboxes');
	const layoutForm = slotsBody?.closest('form');

	if (!(slotsBody instanceof HTMLElement)) return;

	const sectionConfig: SectionBuildConfig = {
		...config,
		categoryOptionsHtml: categoryOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		pageOptionsHtml: pageOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		certOptionsHtml: certOptionsTpl?.innerHTML ?? `<option value="">${config.certAllLabel}</option>`,
		homeFeedCategoryCheckboxesHtml: homeFeedCategoriesTpl?.innerHTML ?? '',
	};

	document.querySelectorAll('.slot-config-panel[data-component="sidebar.banner"]').forEach((block) => {
		bindBannerBlock(block as HTMLElement);
	});

	slotsBody.querySelectorAll('.slot-row').forEach((row) => bindSlotRow(row as HTMLElement, config, sectionConfig));

	document.querySelectorAll('.layout-slot-card').forEach((card) => bindSlotCardLabelSync(card as HTMLElement));

	initLayoutSlotDialogs();

	layoutForm?.addEventListener('submit', () => {
		slotsBody.querySelectorAll('.slot-row').forEach((row) => {
			const label = (row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim();
			const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim();
			if (!label || !id) {
				removeSlotUi(id ?? '');
				row.remove();
			}
		});
	});

	addSlotBtn?.addEventListener('click', () => {
		const component = (addComponentSelect as HTMLSelectElement | null)?.value ?? 'home.pinned';
		addSlot(component, config, sectionConfig);
	});

	document.querySelectorAll<HTMLButtonElement>('.zone-add-slot').forEach((btn) => {
		btn.addEventListener('click', () => {
			const zone = btn.dataset.zone;
			const select = document.querySelector<HTMLSelectElement>(`.zone-add-component[data-zone="${zone}"]`);
			const component = select?.value;
			if (!component) return;
			addSlot(component, config, sectionConfig);
		});
	});
}

export function initLayoutSlotCardSummaries(): void {
	document.querySelectorAll<HTMLElement>('.layout-slot-card').forEach((card) => {
		const id = card.dataset.slotId;
		if (id) refreshSlotCardSummary(id);
	});
}
