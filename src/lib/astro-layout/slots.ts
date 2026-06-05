import type { CategoryDisplays, DisplaySlot } from './types';

export function emptyDisplaysForSlots(slots: DisplaySlot[]): CategoryDisplays {
	return Object.fromEntries(slots.map((s) => [s.id, []]));
}

export function mergeCategoryDisplays(
	slots: DisplaySlot[],
	displays: CategoryDisplays,
): CategoryDisplays {
	const base = emptyDisplaysForSlots(slots);
	for (const slot of slots) {
		const fromFile = displays[slot.id];
		if (Array.isArray(fromFile)) base[slot.id] = fromFile.filter(Boolean);
	}
	return base;
}
