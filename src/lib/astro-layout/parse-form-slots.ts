/** Sloty layoutu z formularza — składanie widgetów, scalanie ze stanem zapisanym i filtr strefy. */
import {
	getComponentKind,
	isLayoutComponentId,
	isSingletonComponent,
	type LayoutZone,
} from './components';
import { validateBannerWidget } from './banners';
import { slotFormFields } from './slot-form-fields';
import { sortSlotsByOrder } from './slots';
import {
	collectSlotIdentities,
	parseBaseWidget,
	strField,
	type SlotIdentity,
} from './parse-form-fields';
import {
	parseBannerWidget,
	parseChromeWidget,
	parseHomeFeedWidget,
	parseLiveFeedWidget,
	parseLocalFeedWidget,
} from './parse-form-widgets';
import type { DisplaySlot, SlotWidgetConfig } from './types';

function mergeSlotWidget(
	prior: DisplaySlot | undefined,
	widget: SlotWidgetConfig,
): SlotWidgetConfig | undefined {
	const merged = { ...prior?.widget, ...widget };
	return Object.keys(merged).length > 0 ? merged : undefined;
}

function parseSlotsFromIdentities(
	form: FormData,
	identities: SlotIdentity[],
	existing: DisplaySlot[] = [],
): DisplaySlot[] {
	const seenSingletons = new Set<string>();
	const slots: DisplaySlot[] = [];

	for (let i = 0; i < identities.length; i++) {
		const { id, label, component, order } = identities[i]!;
		if (!id || !label || !isLayoutComponentId(component)) continue;
		if (isSingletonComponent(component)) {
			if (seenSingletons.has(component)) continue;
			seenSingletons.add(component);
		}

		const prior = existing.find((s) => s.id === id);
		const widget = parseBaseWidget(form, id, order ?? (i + 1) * 10);
		const kind = getComponentKind(component);

		if (kind === 'home_feed') parseHomeFeedWidget(form, id, widget);
		if (kind === 'local_feed') parseLocalFeedWidget(form, id, widget);
		if (kind === 'live_feed') parseLiveFeedWidget(form, id, component, widget);
		if (kind === 'chrome') parseChromeWidget(form, id, component, widget);
		if (kind === 'banner') {
			parseBannerWidget(form, id, widget);
			// Niekompletny baner nie kasuje poprzedniej konfiguracji — zostaje stan sprzed edycji.
			if (!validateBannerWidget(widget, label)) {
				if (prior) slots.push({ ...prior, label });
				continue;
			}
		}

		slots.push({
			id,
			label,
			component,
			widget: mergeSlotWidget(prior, widget),
			entries: component === 'sidebar.recent_changes' ? prior?.entries : undefined,
		});
	}
	return sortSlotsByOrder(slots);
}

export function parseSlotsFromForm(form: FormData, existing: DisplaySlot[] = []): DisplaySlot[] {
	return parseSlotsFromIdentities(form, collectSlotIdentities(form), existing);
}

export function parseSlotsFromFormForZone(
	form: FormData,
	zone: LayoutZone,
	existing: DisplaySlot[] = [],
): DisplaySlot[] {
	const identities = collectSlotIdentities(form).filter(({ id }) => {
		const slotZone = strField(form, slotFormFields.zone(id));
		return slotZone === zone;
	});
	return parseSlotsFromIdentities(form, identities, existing);
}

export function mergeSlotsFromForm(form: FormData, existing: DisplaySlot[]): DisplaySlot[] {
	const parsed = parseSlotsFromForm(form, existing);
	const parsedIds = new Set(parsed.map((s) => s.id));
	const preserved = existing.filter((s) => !parsedIds.has(s.id));
	return sortSlotsByOrder([...preserved, ...parsed]);
}
