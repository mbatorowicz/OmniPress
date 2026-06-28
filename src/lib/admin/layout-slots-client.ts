import { isComponentAllowedInZone, isSingletonComponent, type LayoutZone } from '@/lib/astro-layout/components';
import type { DisplaySlot, SlotWidgetConfig } from '@/lib/astro-layout/types';
import { generateComponentInstanceId } from '@/lib/astro-layout/zones';
import {
	COMPONENT_ADD_TEMPLATES,
	type ComponentAddTemplateId,
	type ComponentRegistryGroup,
} from '@/lib/admin/component-registry';
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
	zoneLabels?: Record<string, string>;
	zoneBadgePrefix?: string;
	templateLabels?: Record<string, string>;
}

function buildSectionConfig(config: LayoutSlotsClientConfig): SectionBuildConfig {
	const categoryOptionsTpl = document.getElementById('slot-banner-category-options');
	const pageOptionsTpl = document.getElementById('slot-banner-page-options');
	const certOptionsTpl = document.getElementById('slot-cert-category-options');
	const homeFeedCategoriesTpl = document.getElementById('slot-home-feed-category-checkboxes');
	return {
		...config,
		categoryOptionsHtml: categoryOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		pageOptionsHtml: pageOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		certOptionsHtml: certOptionsTpl?.innerHTML ?? `<option value="">${config.certAllLabel}</option>`,
		homeFeedCategoryCheckboxesHtml: homeFeedCategoriesTpl?.innerHTML ?? '',
	};
}

function collectExistingComponentsFromDom(): DisplaySlot[] {
	const slots: DisplaySlot[] = [];
	document.querySelectorAll<HTMLElement>('.layout-slot-card').forEach((card) => {
		const id = card.dataset.slotId ?? '';
		const component = card.dataset.component ?? '';
		const label =
			(card.querySelector('.slot-card-label-input') as HTMLInputElement | null)?.value?.trim() ||
			card.querySelector('.layout-slot-card__label')?.textContent?.trim() ||
			id;
		if (id && component) slots.push({ id, label, component });
	});
	document.querySelectorAll<HTMLElement>('.slot-row').forEach((row) => {
		const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim() ?? '';
		const label = (row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim() ?? '';
		const component =
			(row.querySelector('input[name="slot_component"]') as HTMLInputElement | null)?.value?.trim() ??
			(row.querySelector('.slot-component') as HTMLSelectElement | null)?.value ??
			'';
		if (id && component && !slots.some((s) => s.id === id)) {
			slots.push({ id, label: label || id, component });
		}
	});
	return slots;
}

function nextSlotOrderFromDom(): number {
	let max = 0;
	document.querySelectorAll('input[name="slot_widget_order"]').forEach((input) => {
		const n = Number((input as HTMLInputElement).value);
		if (Number.isFinite(n) && n > max) max = n;
	});
	return max > 0 ? max + 10 : 10;
}

function usedSingletonComponents(config: LayoutSlotsClientConfig): Set<string> {
	const used = new Set<string>();
	collectExistingComponentsFromDom().forEach((slot) => {
		if (config.singletonComponents.includes(slot.component)) used.add(slot.component);
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
	const component =
		(row.querySelector('input[name="slot_component"]') as HTMLInputElement | null)?.value?.trim() ??
		(row.querySelector('.slot-component') as HTMLSelectElement | null)?.value ??
		'';
	if (!id || !component) return null;
	return { id, label: label || id, component };
}

function zoneCardsContainer(zone: LayoutZone): HTMLElement | null {
	return document.getElementById(`zone-${zone}-cards`);
}

function registryCardsContainer(group: ComponentRegistryGroup): HTMLElement | null {
	return document.getElementById(`registry-${group}-cards`);
}

function applyWidgetPrefill(panel: HTMLElement, widget: Partial<SlotWidgetConfig>): void {
	if (widget.linkType) {
		const select = panel.querySelector('.slot-banner-link-type') as HTMLSelectElement | null;
		if (select) select.value = widget.linkType;
	}
	if (widget.style) {
		const select = panel.querySelector('.slot-banner-style') as HTMLSelectElement | null;
		if (select) select.value = widget.style;
	}
	if (componentToKind(panel.dataset.component ?? '') === 'banner') {
		syncBannerSubfields(panel);
	}
}

function removeSlotUi(slotId: string): void {
	document.getElementById(`slot-dialog-${slotId}`)?.remove();
	document.querySelector(`.layout-slot-card[data-slot-id="${slotId}"]`)?.remove();
	document.getElementById(`slot-panel-${slotId}`)?.remove();
	document.querySelector(`.slot-row[data-slot-id="${slotId}"]`)?.remove();
}

function appendSlotUi(
	kind: LayoutComponentKind,
	id: string,
	label: string,
	component: string,
	order: number,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
	options: {
		registryGroup?: ComponentRegistryGroup;
		defaultWidget?: Partial<SlotWidgetConfig>;
	} = {},
): void {
	if (!isComponentAllowedInZone(component, targetZone)) return;

	const panelHtml = buildDetailHtml(kind, id, label, component, sectionConfig);
	const componentLabel = config.componentLabels[component] ?? component;
	const cardHtml = buildSlotCardHtml(id, label, component, {
		componentLabels: config.componentLabels,
		settingsLabel: config.settingsLabel,
		disabledLabel: config.disabledLabel,
		order,
		zone: targetZone,
		zoneLabel: config.zoneLabels?.[targetZone],
		zoneBadgePrefix: config.zoneBadgePrefix,
	});
	const dialogHtml = buildSlotDialogShellHtml(
		id,
		`${config.settingsLabel} — ${componentLabel}`,
		config.closeLabel,
		panelHtml,
	);

	const cardsContainer = options.registryGroup
		? registryCardsContainer(options.registryGroup)
		: zoneCardsContainer(targetZone);
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
	if (panel) {
		if (kind === 'banner') bindBannerBlock(panel);
		if (options.defaultWidget) applyWidgetPrefill(panel, options.defaultWidget);
	}
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

function appendTableRow(
	component: string,
	id: string,
	order: number,
	label: string,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	const slotsBody = document.getElementById('slots-body');
	if (!(slotsBody instanceof HTMLElement)) return;
	const tr = document.createElement('tr');
	tr.className = 'slot-row ui-table-dense-row';
	tr.dataset.slotId = id;
	tr.innerHTML = buildListRowHtml(config, id, order, component, label);
	const compSelect = tr.querySelector('.slot-component') as HTMLSelectElement | null;
	if (compSelect) compSelect.value = component;
	slotsBody.appendChild(tr);
	bindSlotRow(tr, targetZone, config, sectionConfig);
}

function syncDetailForRow(
	row: HTMLElement,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	const slot = readRowSlot(row);
	if (!slot) return;
	const kind = componentToKind(slot.component);
	removeSlotUi(slot.id);
	if (!kind) return;
	const order = Number((row.querySelector('.slot-row-order') as HTMLInputElement | null)?.value) || 10;
	appendSlotUi(kind, slot.id, slot.label, slot.component, order, targetZone, config, sectionConfig);
	initLayoutSlotDialogs();
}

function addComponentInstance(
	component: string,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
	options: {
		appendTableRow?: boolean;
		registryGroup?: ComponentRegistryGroup;
		defaultWidget?: Partial<SlotWidgetConfig>;
	} = {},
): void {
	if (!isComponentAllowedInZone(component, targetZone)) return;

	if (
		config.singletonComponents.includes(component) &&
		usedSingletonComponents(config).has(component)
	) {
		return;
	}

	const kind = componentToKind(component);
	if (!kind) return;

	const existing = collectExistingComponentsFromDom();
	const id = generateComponentInstanceId(targetZone, component, existing);
	const order = nextSlotOrderFromDom();
	const defaultLabel = config.componentLabels[component] ?? component;

	if (options.appendTableRow !== false && document.getElementById('slots-body')) {
		appendTableRow(component, id, order, defaultLabel, targetZone, config, sectionConfig);
	}

	appendSlotUi(kind, id, defaultLabel, component, order, targetZone, config, sectionConfig, {
		registryGroup: options.registryGroup,
		defaultWidget: options.defaultWidget,
	});
	initLayoutSlotDialogs();
	refreshLayoutSlotsPreview();
}

export function addComponentFromTemplate(
	templateId: ComponentAddTemplateId,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	const template = COMPONENT_ADD_TEMPLATES[templateId];
	addComponentInstance(template.component, targetZone, config, sectionConfig, {
		appendTableRow: false,
		registryGroup: template.registryGroup,
		defaultWidget: template.defaultWidget,
	});
}

export function addSpecialComponent(
	component: string,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	addComponentInstance(component, targetZone, config, sectionConfig, {
		appendTableRow: false,
		registryGroup: 'special',
	});
}

function bindSlotRow(
	row: HTMLElement,
	targetZone: LayoutZone,
	config: LayoutSlotsClientConfig,
	sectionConfig: SectionBuildConfig,
): void {
	const slot = readRowSlot(row);
	const panel = slot ? document.getElementById(`slot-panel-${slot.id}`) : null;
	if (panel && componentToKind(slot?.component ?? '') === 'banner') bindBannerBlock(panel);

	row.querySelector('.slot-component')?.addEventListener('change', () => {
		syncDetailForRow(row, targetZone, config, sectionConfig);
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

function bindSharedPanels(config: LayoutSlotsClientConfig): SectionBuildConfig {
	const sectionConfig = buildSectionConfig(config);
	document.querySelectorAll('.slot-config-panel[data-component="sidebar.banner"]').forEach((block) => {
		bindBannerBlock(block as HTMLElement);
	});
	document.querySelectorAll('.layout-slot-card').forEach((card) => bindSlotCardLabelSync(card as HTMLElement));
	initLayoutSlotDialogs();
	return sectionConfig;
}

export function initLayoutZoneEditor(zone: LayoutZone, config: LayoutSlotsClientConfig): void {
	const sectionConfig = bindSharedPanels(config);

	document.querySelectorAll<HTMLButtonElement>(`.zone-add-slot[data-zone="${zone}"]`).forEach((btn) => {
		btn.addEventListener('click', () => {
			const select = document.querySelector<HTMLSelectElement>(`.zone-add-component[data-zone="${zone}"]`);
			const component = select?.value;
			if (!component) return;
			addComponentInstance(component, zone, config, sectionConfig, { appendTableRow: false });
		});
	});
}

export function initLayoutSlotsTable(config: LayoutSlotsClientConfig, zone: LayoutZone): void {
	const slotsBody = document.getElementById('slots-body');
	const addSlotBtn = document.getElementById('add-slot');
	const addComponentSelect = document.getElementById('add-slot-component');
	const layoutForm = slotsBody?.closest('form');

	if (!(slotsBody instanceof HTMLElement)) return;

	const sectionConfig = bindSharedPanels(config);

	slotsBody.querySelectorAll('.slot-row').forEach((row) => bindSlotRow(row as HTMLElement, zone, config, sectionConfig));

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
		addComponentInstance(component, zone, config, sectionConfig, { appendTableRow: true });
	});
}

export function initLayoutSlotCardSummaries(): void {
	document.querySelectorAll<HTMLElement>('.layout-slot-card').forEach((card) => {
		const id = card.dataset.slotId;
		if (id) refreshSlotCardSummary(id);
	});
}

function parseAllowedZones(raw: string | undefined): LayoutZone[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((value): value is LayoutZone => typeof value === 'string');
	} catch {
		return [];
	}
}

function configureAddDialogZones(
	zoneSelect: HTMLSelectElement,
	allowedZones: LayoutZone[],
): void {
	Array.from(zoneSelect.options).forEach((option) => {
		const allowed = allowedZones.includes(option.value as LayoutZone);
		option.hidden = !allowed;
		option.disabled = !allowed;
	});
	const firstAllowed = allowedZones.find((zone) =>
		Array.from(zoneSelect.options).some((option) => option.value === zone && !option.disabled),
	);
	if (firstAllowed) zoneSelect.value = firstAllowed;
}

export function initComponentRegistryEditor(config: LayoutSlotsClientConfig): void {
	const sectionConfig = bindSharedPanels(config);
	const dialog = document.getElementById('component-add-dialog') as HTMLDialogElement | null;
	const zoneSelect = document.getElementById('component-add-dialog-zone') as HTMLSelectElement | null;
	const labelEl = document.getElementById('component-add-dialog-template-label');
	const cancelBtn = document.getElementById('component-add-dialog-cancel');
	if (!dialog || !zoneSelect) return;

	let pendingAction: ((zone: LayoutZone) => void) | null = null;

	const openDialog = (allowedZones: LayoutZone[], label: string, action: (zone: LayoutZone) => void) => {
		if (allowedZones.length === 0) return;
		configureAddDialogZones(zoneSelect, allowedZones);
		if (labelEl) labelEl.textContent = label;
		pendingAction = action;
		dialog.showModal();
	};

	dialog.addEventListener('close', () => {
		if (dialog.returnValue !== 'confirm' || !pendingAction) {
			pendingAction = null;
			return;
		}
		const zone = zoneSelect.value as LayoutZone;
		pendingAction(zone);
		pendingAction = null;
	});

	cancelBtn?.addEventListener('click', () => dialog.close('cancel'));

	document.querySelectorAll<HTMLButtonElement>('.registry-add-template').forEach((btn) => {
		btn.addEventListener('click', () => {
			const templateId = btn.dataset.template as ComponentAddTemplateId | undefined;
			if (!templateId || !(templateId in COMPONENT_ADD_TEMPLATES)) return;
			const allowedZones = parseAllowedZones(btn.dataset.allowedZones);
			const label = config.templateLabels?.[templateId] ?? templateId;
			openDialog(allowedZones, label, (zone) => {
				addComponentFromTemplate(templateId, zone, config, sectionConfig);
			});
		});
	});

	document.querySelectorAll<HTMLButtonElement>('.registry-add-special').forEach((btn) => {
		btn.addEventListener('click', () => {
			const component = btn.dataset.component;
			if (!component) return;
			const allowedZones = parseAllowedZones(btn.dataset.allowedZones);
			const label = config.componentLabels[component] ?? component;
			openDialog(allowedZones, label, (zone) => {
				addSpecialComponent(component, zone, config, sectionConfig);
			});
		});
	});
}
