import { isComponentAllowedInZone, isSingletonComponent, type LayoutZone } from '@/lib/astro-layout/components';
import type { SlotWidgetConfig } from '@/lib/astro-layout/types';
import type { ComponentRegistryGroup } from '@/lib/admin/component-registry';
import { bindSlotCardLabelSync } from '@/lib/admin/layout-slot-dialog-client';
import {
	buildDetailHtml,
	buildSlotCardHtml,
	buildSlotDialogShellHtml,
	type LayoutComponentKind,
	type SectionBuildConfig,
} from '@/lib/admin/layout-slots-sections';
import type { LayoutSlotsClientConfig } from '@/lib/admin/layout-slots-client';
import {
	applyWidgetPrefill,
	bindBannerBlock,
	registryCardsContainer,
	slotDialogsHost,
	zoneCardsContainer,
} from './layout-slots-client-dom';

export function appendSlotUi(
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
		enabledLabel: config.enabledLabel,
		formId: config.formId,
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
	const dialogsHost = slotDialogsHost();
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
		if (dialog) (dialogsHost ?? cardsContainer).appendChild(dialog);
	}

	const panel = document.getElementById(`slot-panel-${id}`);
	if (panel) {
		if (kind === 'banner') bindBannerBlock(panel);
		if (options.defaultWidget) applyWidgetPrefill(panel, options.defaultWidget);
	}
}

export function buildListRowHtml(
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

export function appendTableRow(
	component: string,
	id: string,
	order: number,
	label: string,
	config: LayoutSlotsClientConfig,
): HTMLElement | null {
	const slotsBody = document.getElementById('slots-body');
	if (!(slotsBody instanceof HTMLElement)) return null;
	const tr = document.createElement('tr');
	tr.className = 'slot-row ui-table-dense-row';
	tr.dataset.slotId = id;
	tr.innerHTML = buildListRowHtml(config, id, order, component, label);
	const compSelect = tr.querySelector('.slot-component') as HTMLSelectElement | null;
	if (compSelect) compSelect.value = component;
	slotsBody.appendChild(tr);
	return tr;
}
