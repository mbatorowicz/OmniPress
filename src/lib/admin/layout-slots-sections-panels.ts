import { slotFormAttr } from '@/lib/admin/layout-form-ids';
import type { SectionBuildConfig } from './layout-slots-sections-types';

/** Atrybut `form=` dla pól renderowanych poza znacznikiem formularza (dialogi slotów). */
export function fa(config: { formId?: string }): string {
	return slotFormAttr(config.formId);
}

export function panelOpenHtml(id: string, component: string): string {
	return `<div id="slot-panel-${id}" class="ui-fieldset-nested slot-config-panel slot-detail-block" data-slot-id="${id}" data-component="${component}">`;
}

export function panelCloseHtml(): string {
	return '</div>';
}

export function slotPanelHeaderHtml(id: string, label: string, component: string, config: SectionBuildConfig): string {
	const componentLabel = config.componentLabels[component] ?? component;
	const safeLabel = label || id;
	return `
		<header class="slot-panel-header sm:col-span-2">
			<p class="ui-subheading">${componentLabel}</p>
			<p class="ui-hint">${config.slotPanelSectionTitleLabel}: ${safeLabel}</p>
			<p class="ui-caption font-mono">${id}</p>
		</header>`;
}

export function buildHomeFeedCategoriesHtml(id: string, component: string, config: SectionBuildConfig): string {
	const checkboxes = config.homeFeedCategoryCheckboxesHtml.replaceAll('__SLOTID__', id);
	const pinnedHint =
		component === 'home.pinned'
			? `<p class="ui-hint">${config.homeFeedPinnedHint}</p>`
			: '';
	return `
		<fieldset class="home-feed-categories-field sm:col-span-2">
			<legend class="font-medium">${config.homeFeedCategoriesLabel}</legend>
			<p class="ui-hint">${config.homeFeedCategoriesHint}</p>
			${pinnedHint}
			<div class="mt-2 flex flex-col gap-1">${checkboxes}</div>
		</fieldset>`;
}
