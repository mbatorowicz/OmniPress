import { isComponentAllowedInZone, type LayoutZone } from '@/lib/astro-layout/components';
import type { SlotWidgetConfig } from '@/lib/astro-layout/types';
import { generateComponentInstanceId } from '@/lib/astro-layout/zones';
import {
	COMPONENT_ADD_TEMPLATES,
	type ComponentAddTemplateId,
	type ComponentRegistryGroup,
} from '@/lib/admin/component-registry';
import { initLayoutSlotDialogs } from '@/lib/admin/layout-slot-dialog-client';
import { refreshLayoutSlotsPreview } from '@/lib/admin/layout-slots-preview-client';
import { componentToKind, type SectionBuildConfig } from '@/lib/admin/layout-slots-sections';
import type { LayoutSlotsClientConfig } from '@/lib/admin/layout-slots-client';
import {
	bindBannerBlock,
	collectExistingComponentsFromDom,
	nextSlotOrderFromDom,
	readRowSlot,
	removeSlotUi,
	usedSingletonComponents,
} from './layout-slots-client-dom';
import { appendSlotUi, appendTableRow } from './layout-slots-client-ui';

export function syncDetailForRow(
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

export function addComponentInstance(
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
		const tr = appendTableRow(component, id, order, defaultLabel, config);
		if (tr) bindSlotRow(tr, targetZone, config, sectionConfig);
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

export function bindSlotRow(
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
