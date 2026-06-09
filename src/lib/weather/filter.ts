import type { DisplaySlot, SiteAstroLayout, WeatherSlotWidgetConfig } from '@/lib/astro-layout/types';

export function isWeatherSlot(slot: DisplaySlot): boolean {
	return slot.component.trim() === 'sidebar.weather';
}

export function getWeatherSlotConfig(slot: DisplaySlot): WeatherSlotWidgetConfig | null {
	if (!isWeatherSlot(slot)) return null;
	const widget = slot.widget;
	if (!widget?.terytPowiat?.trim()) return null;
	if (widget.enabled === false) return null;
	return widget as WeatherSlotWidgetConfig;
}

export function findWeatherSlot(layout: SiteAstroLayout): WeatherSlotWidgetConfig | null {
	for (const slot of layout.slots) {
		const config = getWeatherSlotConfig(slot);
		if (config) return config;
	}
	return null;
}
