import { LAYOUT_ZONE_ORDER, type LayoutZone } from '@/lib/astro-layout/components';
import { initLayoutSlotsPreview } from '@/lib/admin/layout-slots-preview-client';
import { parseInlineJson } from '@/lib/ui/inline-json';
import {
	initLayoutSlotCardSummaries,
	initLayoutSlotsTable,
	initLayoutZoneEditor,
} from './layout-slots-client';
import { initComponentRegistryEditor } from './layout-slots-client-registry';
import {
	layoutSlotsVarsToClientConfig,
	type LayoutSlotsClientVars,
} from './layout-slots-client-vars';

export const LAYOUT_SLOTS_BOOT_ATTR = 'data-op-layout-slots-boot';
export const COMPONENT_REGISTRY_BOOT_ATTR = 'data-op-component-registry-boot';

export type LayoutSlotsBootPayload = LayoutSlotsClientVars & {
	includePreview: boolean;
	advancedTable: boolean;
	editorZone: string;
	zoneFormId: string;
};

export type ComponentRegistryBootPayload = LayoutSlotsClientVars & {
	componentsFormId: string;
	zoneLabels: Record<string, string>;
	zoneBadgePrefix: string;
	templateLabels: Record<string, string>;
};

function readBootPayloads<T>(attr: string): T[] {
	return [...document.querySelectorAll(`script[${attr}]`)].flatMap((el) => {
		const parsed = parseInlineJson<T>(el.textContent);
		return parsed ? [parsed] : [];
	});
}

function asLayoutZone(raw: string): LayoutZone | null {
	return (LAYOUT_ZONE_ORDER as readonly string[]).includes(raw) ? (raw as LayoutZone) : null;
}

export function bootLayoutSlotsEditors(): void {
	if (document.documentElement.dataset.opLayoutSlotsBoot === '1') return;
	document.documentElement.dataset.opLayoutSlotsBoot = '1';

	const payloads = readBootPayloads<LayoutSlotsBootPayload>(LAYOUT_SLOTS_BOOT_ATTR);
	for (const payload of payloads) {
		const config = layoutSlotsVarsToClientConfig(payload, payload.zoneFormId);
		if (payload.includePreview) {
			initLayoutSlotsPreview({
				componentLabels: payload.componentLabels,
				moveUp: payload.moveUp,
				moveDown: payload.moveDown,
				disabledLabel: payload.disabledLabel,
				emptyZone: payload.emptyZone,
				chipNoCategories: payload.previewChipNoCategories,
				chipCategoriesPrefix: payload.previewChipCategoriesPrefix,
				chipPinnedOnly: payload.previewChipPinnedOnly,
				chipLinkPrefix: payload.previewChipLinkPrefix,
			});
		}
		const zone = asLayoutZone(payload.editorZone);
		if (!zone) continue;
		if (payload.advancedTable) initLayoutSlotsTable(config, zone);
		else initLayoutZoneEditor(zone, config);
	}
	if (payloads.length > 0) initLayoutSlotCardSummaries();
}

export function bootComponentRegistryEditor(): void {
	if (document.documentElement.dataset.opComponentRegistryBoot === '1') return;
	document.documentElement.dataset.opComponentRegistryBoot = '1';

	const payload = readBootPayloads<ComponentRegistryBootPayload>(COMPONENT_REGISTRY_BOOT_ATTR)[0];
	if (!payload) return;

	initComponentRegistryEditor(
		layoutSlotsVarsToClientConfig(payload, payload.componentsFormId, {
			zoneLabels: payload.zoneLabels,
			zoneBadgePrefix: payload.zoneBadgePrefix,
			templateLabels: payload.templateLabels,
		}),
	);
	initLayoutSlotCardSummaries();
}
