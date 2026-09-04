import type { LayoutZone } from '@/lib/astro-layout/components';
import {
	COMPONENT_ADD_TEMPLATES,
	type ComponentAddTemplateId,
} from '@/lib/admin/component-registry';
import type { LayoutSlotsClientConfig } from '@/lib/admin/layout-slots-client';
import { bindSharedPanels } from './layout-slots-client-dom';
import { addComponentFromTemplate, addSpecialComponent } from './layout-slots-client-rows';

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
