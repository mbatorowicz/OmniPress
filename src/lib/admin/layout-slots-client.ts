import { refreshLayoutSlotsPreview } from '@/lib/admin/layout-slots-preview-client';

export interface LayoutSlotsClientConfig {
	removeSlotLabel: string;
	variantDefault: string;
	variantAlert: string;
	styleImage: string;
	styleText: string;
	variantBannerDefault: string;
	variantBannerBlue: string;
	linkCategory: string;
	linkPage: string;
	linkExternal: string;
	componentOptionsHtml: string;
	singletonComponents: string[];
	certAllLabel: string;
}

const FEED = ['home.pinned', 'home.latest', 'sidebar.recent_changes', 'sidebar.cert_advisories'];
const BANNER = 'sidebar.banner';
const CERT = 'sidebar.cert_advisories';

function supportsHideWhenEmpty(component: string): boolean {
	return component !== BANNER && (FEED.includes(component) || component === 'sidebar.weather');
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

function syncBannerSubfields(row: HTMLElement): void {
	const style = (row.querySelector('.slot-banner-style') as HTMLSelectElement | null)?.value ?? 'image';
	const linkType = (row.querySelector('.slot-banner-link-type') as HTMLSelectElement | null)?.value ?? 'category';
	row.querySelectorAll('.slot-banner-field-image').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', style !== 'image');
	});
	row.querySelectorAll('.slot-banner-field-text').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', style !== 'text');
	});
	row.querySelectorAll('.slot-banner-field-category').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', linkType !== 'category');
	});
	row.querySelectorAll('.slot-banner-field-page').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', linkType !== 'page');
	});
	row.querySelectorAll('.slot-banner-field-external').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', linkType !== 'external');
	});
}

function syncSlotRowVisibility(row: HTMLElement): void {
	const component = (row.querySelector('.slot-component') as HTMLSelectElement | null)?.value ?? '';
	const isFeed = FEED.includes(component);
	const isBanner = component === BANNER;
	const isCert = component === CERT;
	const canHideWhenEmpty = supportsHideWhenEmpty(component);
	row.querySelectorAll('.slot-field-feed').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', !isFeed);
	});
	row.querySelectorAll('.slot-field-hide-empty').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', !canHideWhenEmpty);
	});
	row.querySelectorAll('.slot-field-cert').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', !isCert);
	});
	row.querySelectorAll('.slot-field-banner').forEach((el) => {
		el.classList.toggle('slot-cell-hidden', !isBanner);
	});
	if (isBanner) syncBannerSubfields(row);
}

function buildSlotRowHtml(config: LayoutSlotsClientConfig, id: string, order: number, categoryOptions: string, pageOptions: string, certOptions: string): string {
	const c = config;
	return `
		<td class="ui-table-dense-td"><input name="slot_id" value="${id}" required class="ui-input-compact ui-input-compact--mono w-24" /></td>
		<td class="ui-table-dense-td"><input name="slot_label" required class="ui-input-compact w-32" /></td>
		<td class="ui-table-dense-td"><select name="slot_component" class="slot-component ui-select-compact w-40">${c.componentOptionsHtml}</select></td>
		<td class="ui-table-dense-td"><input name="slot_widget_order" type="number" min="0" value="${order}" class="ui-input-compact w-16" /></td>
		<td class="ui-table-dense-td text-center"><input type="checkbox" name="slot_enabled_${id}" checked /></td>
		<td class="ui-table-dense-td slot-field-feed"><input name="slot_widget_title" class="ui-input-compact w-32" /></td>
		<td class="ui-table-dense-td slot-field-feed"><input name="slot_widget_section_title" class="ui-input-compact w-32" /></td>
		<td class="ui-table-dense-td slot-field-feed"><input name="slot_widget_limit" type="number" min="1" class="ui-input-compact w-16" /></td>
		<td class="ui-table-dense-td slot-field-feed"><input name="slot_widget_empty_text" class="ui-input-compact w-32" /></td>
		<td class="ui-table-dense-td slot-field-hide-empty text-center"><input type="checkbox" name="slot_hide_when_empty_${id}" /></td>
		<td class="ui-table-dense-td slot-field-feed"><input name="slot_widget_more_link" class="ui-input-compact ui-input-compact--mono w-28" /></td>
		<td class="ui-table-dense-td slot-field-feed"><select name="slot_widget_variant" class="ui-select-compact"><option value="default">${c.variantDefault}</option><option value="alert">${c.variantAlert}</option></select></td>
		<td class="ui-table-dense-td slot-field-cert"><select name="slot_cert_category_filter" class="ui-select-compact w-36">${certOptions}</select></td>
		<td class="ui-table-dense-td slot-field-banner"><select name="slot_banner_style" class="slot-banner-style ui-select-compact"><option value="image">${c.styleImage}</option><option value="text">${c.styleText}</option></select></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-image"><input name="slot_banner_image_url" class="ui-input-compact ui-input-compact--mono w-36" /></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-image"><select name="slot_banner_image_variant" class="ui-select-compact"><option value="default">${c.variantBannerDefault}</option><option value="blue">${c.variantBannerBlue}</option></select></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-text"><input name="slot_banner_text_title" class="ui-input-compact w-28" /></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-text"><input name="slot_banner_text_button" class="ui-input-compact w-24" /></td>
		<td class="ui-table-dense-td slot-field-banner"><select name="slot_banner_link_type" class="slot-banner-link-type ui-select-compact"><option value="category">${c.linkCategory}</option><option value="page">${c.linkPage}</option><option value="external">${c.linkExternal}</option></select></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-category"><select name="slot_banner_category_slug" class="ui-select-compact w-32">${categoryOptions}</select></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-page"><select name="slot_banner_page_path" class="ui-select-compact w-36">${pageOptions}</select></td>
		<td class="ui-table-dense-td slot-field-banner slot-banner-field-external"><input name="slot_banner_external_url" class="ui-input-compact ui-input-compact--mono w-36" placeholder="https://" /></td>
		<td class="ui-table-dense-td"><button type="button" class="remove-slot ui-link--danger">${c.removeSlotLabel}</button></td>
	`;
}

export function initLayoutSlotsTable(config: LayoutSlotsClientConfig): void {
	const slotsBody = document.getElementById('slots-body');
	const addSlotBtn = document.getElementById('add-slot');
	const addComponentSelect = document.getElementById('add-slot-component');
	const categoryOptionsTpl = document.getElementById('slot-banner-category-options');
	const pageOptionsTpl = document.getElementById('slot-banner-page-options');
	const certOptionsTpl = document.getElementById('slot-cert-category-options');
	const layoutForm = slotsBody?.closest('form');

	if (!(slotsBody instanceof HTMLElement)) return;

	function bindSlotRow(row: HTMLElement): void {
		row.querySelector('.slot-component')?.addEventListener('change', () => {
			syncSlotRowVisibility(row);
			refreshLayoutSlotsPreview();
		});
		row.querySelector('.slot-banner-style')?.addEventListener('change', () => syncBannerSubfields(row));
		row.querySelector('.slot-banner-link-type')?.addEventListener('change', () => syncBannerSubfields(row));
		row.querySelector('.remove-slot')?.addEventListener('click', () => {
			if (slotsBody.querySelectorAll('.slot-row').length <= 1) return;
			row.remove();
			refreshLayoutSlotsPreview();
		});
		syncSlotRowVisibility(row);
	}

	slotsBody.querySelectorAll('.slot-row').forEach((row) => bindSlotRow(row as HTMLElement));

	layoutForm?.addEventListener('submit', () => {
		slotsBody.querySelectorAll('.slot-row').forEach((row) => {
			const label = (row.querySelector('input[name="slot_label"]') as HTMLInputElement | null)?.value?.trim();
			const id = (row.querySelector('input[name="slot_id"]') as HTMLInputElement | null)?.value?.trim();
			if (!label || !id) row.remove();
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

		const id = `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const order = nextSlotOrder(slotsBody);
		const categoryOptions = categoryOptionsTpl?.innerHTML ?? '<option value="">—</option>';
		const pageOptions = pageOptionsTpl?.innerHTML ?? '<option value="">—</option>';
		const certOptions = certOptionsTpl?.innerHTML ?? `<option value="">${config.certAllLabel}</option>`;
		const tr = document.createElement('tr');
		tr.className = 'slot-row ui-table-dense-row';
		tr.dataset.slotId = id;
		tr.innerHTML = buildSlotRowHtml(config, id, order, categoryOptions, pageOptions, certOptions);
		const compSelect = tr.querySelector('.slot-component') as HTMLSelectElement | null;
		if (compSelect) compSelect.value = component;
		slotsBody.appendChild(tr);
		bindSlotRow(tr);
		refreshLayoutSlotsPreview();
	});
}
