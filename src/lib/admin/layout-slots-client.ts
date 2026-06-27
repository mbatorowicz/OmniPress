import { refreshLayoutSlotsPreview } from '@/lib/admin/layout-slots-preview-client';
import {
	buildDetailHtml,
	componentToKind,
	type LayoutComponentKind,
	type SectionBuildConfig,
} from '@/lib/admin/layout-slots-sections';

export interface LayoutSlotsClientConfig extends SectionBuildConfig {
	removeSlotLabel: string;
	componentOptionsHtml: string;
	singletonComponents: string[];
	sectionTitles: Record<LayoutComponentKind, string>;
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

function ensureKindSection(
	sectionsRoot: HTMLElement,
	kind: LayoutComponentKind,
	title: string,
): HTMLElement {
	let section = sectionsRoot.querySelector(`.slot-kind-section[data-kind="${kind}"]`) as HTMLElement | null;
	if (!section) {
		section = document.createElement('div');
		section.className = 'ui-divider-section slot-kind-section';
		section.dataset.kind = kind;
		section.innerHTML = `<h3 class="ui-section-title">${title}</h3>`;
		sectionsRoot.appendChild(section);
	}
	section.hidden = false;
	return section;
}

function hideEmptySections(sectionsRoot: HTMLElement): void {
	sectionsRoot.querySelectorAll('.slot-kind-section').forEach((section) => {
		const hasBlocks = section.querySelectorAll('.slot-detail-block').length > 0;
		(section as HTMLElement).hidden = !hasBlocks;
	});
}

function removeDetailBlock(sectionsRoot: HTMLElement, slotId: string): void {
	sectionsRoot.querySelector(`.slot-detail-block[data-slot-id="${slotId}"]`)?.remove();
	hideEmptySections(sectionsRoot);
}

function addDetailBlock(
	sectionsRoot: HTMLElement,
	kind: LayoutComponentKind,
	id: string,
	label: string,
	config: LayoutSlotsClientConfig,
): void {
	const section = ensureKindSection(sectionsRoot, kind, config.sectionTitles[kind]);
	const wrapper = document.createElement('div');
	wrapper.innerHTML = buildDetailHtml(kind, id, label, config);
	const block = wrapper.firstElementChild as HTMLElement;
	section.appendChild(block);
	if (kind === 'banner') bindBannerBlock(block);
}

function syncDetailForRow(
	row: HTMLElement,
	sectionsRoot: HTMLElement,
	config: LayoutSlotsClientConfig,
	previousKind: LayoutComponentKind | null,
): void {
	const slot = readRowSlot(row);
	if (!slot) return;
	const kind = componentToKind(slot.component);
	removeDetailBlock(sectionsRoot, slot.id);
	if (!kind) return;
	if (previousKind === kind) {
		const existing = sectionsRoot.querySelector(`.slot-detail-block[data-slot-id="${slot.id}"]`);
		if (existing) return;
	}
	addDetailBlock(sectionsRoot, kind, slot.id, slot.label, config);
}

function buildListRowHtml(config: LayoutSlotsClientConfig, id: string, order: number): string {
	return `
		<td class="ui-table-dense-td"><input name="slot_id" value="${id}" required class="ui-input-compact ui-input-compact--mono w-24" /></td>
		<td class="ui-table-dense-td"><input name="slot_label" required class="ui-input-compact w-32" /></td>
		<td class="ui-table-dense-td"><select name="slot_component" class="slot-component ui-select-compact w-48">${config.componentOptionsHtml}</select></td>
		<td class="ui-table-dense-td"><input name="slot_widget_order" type="number" min="0" value="${order}" class="ui-input-compact w-16" /></td>
		<td class="ui-table-dense-td text-center"><input type="checkbox" name="slot_enabled_${id}" checked /></td>
		<td class="ui-table-dense-td"><button type="button" class="remove-slot ui-btn ui-btn--link-danger">${config.removeSlotLabel}</button></td>
	`;
}

export function initLayoutSlotsTable(config: LayoutSlotsClientConfig): void {
	const slotsBody = document.getElementById('slots-body');
	const sectionsRoot = document.getElementById('slots-kind-sections');
	const addSlotBtn = document.getElementById('add-slot');
	const addComponentSelect = document.getElementById('add-slot-component');
	const categoryOptionsTpl = document.getElementById('slot-banner-category-options');
	const pageOptionsTpl = document.getElementById('slot-banner-page-options');
	const certOptionsTpl = document.getElementById('slot-cert-category-options');
	const layoutForm = slotsBody?.closest('form');

	if (!(slotsBody instanceof HTMLElement) || !(sectionsRoot instanceof HTMLElement)) return;

	const sectionConfig: SectionBuildConfig = {
		...config,
		categoryOptionsHtml: categoryOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		pageOptionsHtml: pageOptionsTpl?.innerHTML ?? '<option value="">—</option>',
		certOptionsHtml: certOptionsTpl?.innerHTML ?? `<option value="">${config.certAllLabel}</option>`,
	};

	const rowKindMap = new WeakMap<HTMLElement, LayoutComponentKind | null>();

	function bindSlotRow(row: HTMLElement): void {
		const slot = readRowSlot(row);
		rowKindMap.set(row, slot ? componentToKind(slot.component) : null);

		row.querySelectorAll('.slot-detail-block').forEach((block) => {
			if (componentToKind(slot?.component ?? '') === 'banner') bindBannerBlock(block as HTMLElement);
		});

		row.querySelector('.slot-component')?.addEventListener('change', () => {
			const previousKind = rowKindMap.get(row) ?? null;
			const current = readRowSlot(row);
			rowKindMap.set(row, current ? componentToKind(current.component) : null);
			syncDetailForRow(row, sectionsRoot, { ...config, ...sectionConfig }, previousKind);
			refreshLayoutSlotsPreview();
		});

		row.querySelector('.remove-slot')?.addEventListener('click', () => {
			if (slotsBody.querySelectorAll('.slot-row').length <= 1) return;
			const slot = readRowSlot(row);
			if (slot) removeDetailBlock(sectionsRoot, slot.id);
			row.remove();
			refreshLayoutSlotsPreview();
		});
	}

	sectionsRoot.querySelectorAll('.slot-detail-block').forEach((block) => {
		const kind = (block.closest('.slot-kind-section') as HTMLElement | null)?.dataset.kind as
			| LayoutComponentKind
			| undefined;
		if (kind === 'banner') bindBannerBlock(block as HTMLElement);
	});
	hideEmptySections(sectionsRoot);

	slotsBody.querySelectorAll('.slot-row').forEach((row) => bindSlotRow(row as HTMLElement));

	layoutForm?.addEventListener('submit', () => {
		slotsBody.querySelectorAll('.slot-row').forEach((row) => {
			const label = (row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim();
			const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim();
			if (!label || !id) {
				removeDetailBlock(sectionsRoot, id ?? '');
				row.remove();
			}
		});
	});

	addSlotBtn?.addEventListener('click', () => {
		const component = (addComponentSelect as HTMLSelectElement | null)?.value ?? 'home.pinned';
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
		const tr = document.createElement('tr');
		tr.className = 'slot-row ui-table-dense-row';
		tr.dataset.slotId = id;
		tr.innerHTML = buildListRowHtml(config, id, order);
		const compSelect = tr.querySelector('.slot-component') as HTMLSelectElement | null;
		if (compSelect) compSelect.value = component;
		slotsBody.appendChild(tr);
		addDetailBlock(sectionsRoot, kind, id, '', { ...config, ...sectionConfig });
		bindSlotRow(tr);
		refreshLayoutSlotsPreview();
	});
}
