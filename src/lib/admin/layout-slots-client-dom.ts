import type { DisplaySlot, SlotWidgetConfig } from '@/lib/astro-layout/types';
import type { ComponentRegistryGroup } from '@/lib/admin/component-registry';
import type { LayoutZone } from '@/lib/astro-layout/components';
import {
	bindSlotCardLabelSync,
	initLayoutSlotDialogs,
} from '@/lib/admin/layout-slot-dialog-client';
import { componentToKind, type SectionBuildConfig } from '@/lib/admin/layout-slots-sections';
import type { LayoutSlotsClientConfig } from '@/lib/admin/layout-slots-client';

export function buildSectionConfig(config: LayoutSlotsClientConfig): SectionBuildConfig {
	const categoryOptionsTpl = document.getElementById('slot-banner-category-options');
	const pageOptionsTpl = document.getElementById('slot-banner-page-options');
	const certOptionsTpl = document.getElementById('slot-cert-category-options');
	const homeFeedCategoriesTpl = document.getElementById('slot-home-feed-category-checkboxes');
	return {
		...config,
		categoryOptionsHtml: categoryOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		pageOptionsHtml: pageOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		certOptionsHtml: certOptionsTpl?.innerHTML ?? `<option value="">${config.certAllLabel}</option>`,
		homeFeedCategoryCheckboxesHtml: (homeFeedCategoriesTpl?.innerHTML ?? '')
			.replaceAll('__FORMID__', config.formId ?? '')
			.replaceAll('form=""', ''),
	};
}

export function collectExistingComponentsFromDom(): DisplaySlot[] {
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

export function nextSlotOrderFromDom(): number {
	let max = 0;
	document.querySelectorAll('input[name="slot_widget_order"]').forEach((input) => {
		const n = Number((input as HTMLInputElement).value);
		if (Number.isFinite(n) && n > max) max = n;
	});
	return max > 0 ? max + 10 : 10;
}

export function usedSingletonComponents(config: LayoutSlotsClientConfig): Set<string> {
	const used = new Set<string>();
	collectExistingComponentsFromDom().forEach((slot) => {
		if (config.singletonComponents.includes(slot.component)) used.add(slot.component);
	});
	return used;
}

export function syncBannerSubfields(block: HTMLElement): void {
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

export function bindBannerBlock(block: HTMLElement): void {
	block.querySelector('.slot-banner-style')?.addEventListener('change', () => syncBannerSubfields(block));
	block.querySelector('.slot-banner-link-type')?.addEventListener('change', () => syncBannerSubfields(block));
	syncBannerSubfields(block);
}

export function readRowSlot(row: HTMLElement): { id: string; label: string; component: string } | null {
	const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim() ?? '';
	const label = (row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim() ?? '';
	const component =
		(row.querySelector('input[name="slot_component"]') as HTMLInputElement | null)?.value?.trim() ??
		(row.querySelector('.slot-component') as HTMLSelectElement | null)?.value ??
		'';
	if (!id || !component) return null;
	return { id, label: label || id, component };
}

export function zoneCardsContainer(zone: LayoutZone): HTMLElement | null {
	return document.getElementById(`zone-${zone}-cards`);
}

export function registryCardsContainer(group: ComponentRegistryGroup): HTMLElement | null {
	return document.getElementById(`registry-${group}-cards`);
}

export function slotDialogsHost(): HTMLElement | null {
	return document.getElementById('slot-dialogs-host');
}

export function applyWidgetPrefill(panel: HTMLElement, widget: Partial<SlotWidgetConfig>): void {
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

export function removeSlotUi(slotId: string): void {
	document.getElementById(`slot-dialog-${slotId}`)?.remove();
	document.querySelector(`.layout-slot-card[data-slot-id="${slotId}"]`)?.remove();
	document.getElementById(`slot-panel-${slotId}`)?.remove();
	document.querySelector(`.slot-row[data-slot-id="${slotId}"]`)?.remove();
}

export function bindSharedPanels(config: LayoutSlotsClientConfig): SectionBuildConfig {
	const sectionConfig = buildSectionConfig(config);
	document.querySelectorAll('.slot-config-panel[data-component="sidebar.banner"]').forEach((block) => {
		bindBannerBlock(block as HTMLElement);
	});
	document.querySelectorAll('.layout-slot-card').forEach((card) => bindSlotCardLabelSync(card as HTMLElement));
	initLayoutSlotDialogs();
	return sectionConfig;
}
