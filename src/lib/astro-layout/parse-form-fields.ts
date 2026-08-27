/** Odczyt pojedynczych pól FormData — konwersje, listy i tożsamość slotów. */
import type { SlotWidgetConfig } from './types';

export function parseIntField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export function parseOrderField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export function strField(form: FormData, name: string): string {
	return String(form.get(name) ?? '').trim();
}

export function strFields(form: FormData, name: string): string[] {
	return form.getAll(name).map((v) => String(v).trim());
}

/** Wartości z pola wieloliniowego (textarea) — jedna niepusta linia = jeden wpis. */
export function multilineValues(form: FormData, name: string): string[] {
	return strField(form, name)
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/** Rozbija linię „lewa | prawa” na parę; brak separatora = całość po lewej. */
export function splitPipe(line: string): [string, string] {
	const idx = line.indexOf('|');
	if (idx === -1) return [line.trim(), ''];
	return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
}

export function parseBaseWidget(form: FormData, id: string, orderHint?: number): SlotWidgetConfig {
	const widget: SlotWidgetConfig = {};
	widget.order = orderHint ?? 10;
	if (form.get(`slot_enabled_${id}`) !== 'on') widget.enabled = false;
	return widget;
}

export type SlotIdentity = {
	id: string;
	label: string;
	component: string;
	order?: number;
};

/** Zbiera tożsamość slotów po ID — przy duplikatach wygrywa ostatnie wystąpienie (tabela zaawansowana). */
export function collectSlotIdentities(form: FormData): SlotIdentity[] {
	const ids = form.getAll('slot_id').map((v) => String(v).trim());
	const labels = form.getAll('slot_label').map((v) => String(v).trim());
	const components = form.getAll('slot_component').map((v) => String(v).trim());
	const orders = form.getAll('slot_widget_order');

	const byId = new Map<string, SlotIdentity>();
	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		if (!id) continue;
		byId.set(id, {
			id,
			label: labels[i] ?? '',
			component: components[i] ?? '',
			order: parseOrderField(orders[i] ?? null),
		});
	}
	return [...byId.values()];
}

export function formHasDisplayFields(form: FormData, slotId: string): boolean {
	const prefix = `display_${slotId}_`;
	for (const key of form.keys()) {
		if (String(key).startsWith(prefix)) return true;
	}
	return false;
}
