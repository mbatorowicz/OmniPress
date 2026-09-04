import {
	getComponentsAddableInZone,
	getComponentsOfKind,
	LAYOUT_COMPONENT_KINDS,
	type LayoutComponentKind,
	type LayoutZone,
} from '@/lib/astro-layout/components';
import { fa, panelCloseHtml, panelOpenHtml, slotPanelHeaderHtml } from './layout-slots-sections-panels';
import type { SectionBuildConfig } from './layout-slots-sections-types';
import { buildChromeDetailHtml } from './layout-slots-sections-chrome';
import {
	buildBannerDetailHtml,
	buildHomeFeedDetailHtml,
	buildLiveFeedDetailHtml,
	buildLocalFeedDetailHtml,
} from './layout-slots-sections-widgets';

export function buildDetailHtml(
	kind: LayoutComponentKind,
	id: string,
	label: string,
	component: string,
	config: SectionBuildConfig,
): string {
	switch (kind) {
		case 'home_feed':
			return buildHomeFeedDetailHtml(id, label, component, config);
		case 'local_feed':
			return buildLocalFeedDetailHtml(id, label, component, config);
		case 'live_feed':
			return buildLiveFeedDetailHtml(id, label, component, config);
		case 'banner':
			return buildBannerDetailHtml(id, label, component, config);
		case 'chrome':
			return buildChromeDetailHtml(id, label, component, config);
		case 'navigation':
			return panelOpenHtml(id, component) + slotPanelHeaderHtml(id, label, component, config) + panelCloseHtml();
	}
}

export function editableZoneComponents(zone: LayoutZone): string[] {
	return getComponentsAddableInZone(zone);
}

const KIND_LABELS: Record<LayoutComponentKind, string> = {
	chrome: 'Elementy strony',
	navigation: 'Nawigacja',
	home_feed: 'Feedy strony głównej',
	live_feed: 'Widgety na żywo',
	local_feed: 'Feedy lokalne',
	banner: 'Banery',
};

export function buildZoneComponentOptionsHtml(
	zone: LayoutZone,
	componentLabels: Record<string, string>,
	selectedComponent?: string,
): string {
	return getComponentsAddableInZone(zone)
		.map(
			(id) =>
				`<option value="${id}"${selectedComponent === id ? ' selected' : ''}>${componentLabels[id] ?? id}</option>`,
		)
		.join('');
}

export function buildComponentOptionsGroupedHtml(
	componentLabels: Record<string, string>,
	_zoneTitles: Record<LayoutZone, string>,
	options?: {
		filterZone?: LayoutZone;
		selectedComponent?: string;
	},
): string {
	if (options?.filterZone) {
		return buildZoneComponentOptionsHtml(
			options.filterZone,
			componentLabels,
			options.selectedComponent,
		);
	}

	return LAYOUT_COMPONENT_KINDS.map((kind) => {
		const ids = getComponentsOfKind(kind);
		if (ids.length === 0) return '';
		const optgroupLabel = KIND_LABELS[kind] ?? kind;
		const optionsHtml = ids
			.map(
				(id) =>
					`<option value="${id}"${options?.selectedComponent === id ? ' selected' : ''}>${componentLabels[id] ?? id}</option>`,
			)
			.join('');
		return `<optgroup label="${optgroupLabel}">${optionsHtml}</optgroup>`;
	}).join('');
}

export function buildSlotCardHtml(
	id: string,
	label: string,
	component: string,
	config: {
		componentLabels: Record<string, string>;
		settingsLabel: string;
		enabledLabel: string;
		enabled?: boolean;
		order?: number;
		summaryHtml?: string;
		zone?: string;
		zoneLabel?: string;
		zoneBadgePrefix?: string;
		formId?: string;
	},
): string {
	const componentLabel = config.componentLabels[component] ?? component;
	const safeLabel = label || id;
	const enabled = config.enabled !== false;
	const order = config.order ?? 0;
	const summary = config.summaryHtml ?? '';
	const zoneField =
		config.zone != null
			? `<input type="hidden" name="slot_zone_${id}" value="${config.zone}" class="slot-card-zone-input" />`
			: '';
	const zoneBadge =
		config.zoneLabel && config.zoneBadgePrefix
			? `<p class="layout-slot-card__zone ui-caption text-text-muted">${config.zoneBadgePrefix}: ${config.zoneLabel}</p>`
			: '';
	const dataZone = config.zone ? ` data-zone="${config.zone}"` : '';
	return `
		<article class="layout-slot-card" data-slot-id="${id}" data-component="${component}"${dataZone}>
			<input type="hidden" name="slot_id" value="${id}" />
			<input type="hidden" name="slot_label" value="${safeLabel}" class="slot-card-label-input" />
			<input type="hidden" name="slot_component" value="${component}" />
			${zoneField}
			<input type="hidden" name="slot_widget_order" value="${order}" class="slot-card-order-input" />
			<div class="layout-slot-card__main">
				<div>
					<p class="layout-slot-card__type">${componentLabel}</p>
					<p class="layout-slot-card__label">${safeLabel}</p>
					${zoneBadge}
					<div class="layout-slot-card__chips">${summary}</div>
				</div>
				<div class="layout-slot-card__actions">
					<label class="layout-slot-card__enabled flex items-center gap-1.5 text-sm">
						<input type="checkbox"${fa(config)} name="slot_enabled_${id}" ${enabled ? 'checked' : ''} class="slot-card-enabled" />
						<span>${config.enabledLabel}</span>
					</label>
					<button type="button" class="slot-settings-open ui-btn ui-btn--secondary ui-btn--compact" data-dialog-id="slot-dialog-${id}" onclick="var d=document.getElementById(this.dataset.dialogId);if(d&&typeof d.showModal==='function'){try{d.showModal()}catch(e){console.error('[OmniPress] showModal:',e)}}">${config.settingsLabel}</button>
				</div>
			</div>
		</article>`;
}

export function buildSlotDialogShellHtml(
	id: string,
	title: string,
	closeLabel: string,
	panelHtml: string,
): string {
	return `
		<dialog id="slot-dialog-${id}" class="slot-settings-dialog">
			<div class="slot-settings-dialog__panel">
				<header class="slot-settings-dialog__header">
					<h3 class="slot-settings-dialog__title">${title}</h3>
					<button type="button" class="slot-dialog-close ui-btn ui-btn--secondary ui-btn--compact" onclick="var d=this.closest('dialog');if(d&&typeof d.close==='function')d.close()">${closeLabel}</button>
				</header>
				<div class="slot-settings-dialog__body">${panelHtml}</div>
			</div>
		</dialog>`;
}
