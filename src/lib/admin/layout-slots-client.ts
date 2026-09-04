import type { LayoutZone } from '@/lib/astro-layout/components';
import { refreshSlotCardSummary } from '@/lib/admin/layout-slot-dialog-client';
import type { SectionBuildConfig } from '@/lib/admin/layout-slots-sections';
import { bindSharedPanels, removeSlotUi } from './layout-slots-client-dom';
import { addComponentInstance, bindSlotRow } from './layout-slots-client-rows';

export interface LayoutSlotsClientConfig extends SectionBuildConfig {
	removeSlotLabel: string;
	formId?: string;
	componentOptionsHtml: string;
	singletonComponents: string[];
	settingsLabel: string;
	closeLabel: string;
	enabledLabel: string;
	zoneLabels?: Record<string, string>;
	zoneBadgePrefix?: string;
	templateLabels?: Record<string, string>;
}

export { addComponentFromTemplate, addSpecialComponent } from './layout-slots-client-rows';
export { initComponentRegistryEditor } from './layout-slots-client-registry';

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
