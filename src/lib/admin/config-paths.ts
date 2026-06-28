import { DEFAULT_LAYOUT_PATH, DEFAULT_CATEGORIES_PATH, DEFAULT_NAVIGATION_PATH } from '@/lib/astro-layout/types';

function configPath(config: Record<string, unknown>, key: string, fallback: string): string {
	const raw = config[key];
	return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
}

export function layoutConfigPath(config: Record<string, unknown>): string {
	return configPath(config, 'layout_path', DEFAULT_LAYOUT_PATH);
}

/** @deprecated użyj layoutConfigPath */
export function categoriesConfigPath(config: Record<string, unknown>): string {
	const layout = configPath(config, 'layout_path', '');
	if (layout) return layout;
	return configPath(config, 'categories_path', DEFAULT_CATEGORIES_PATH);
}

/** @deprecated użyj layoutConfigPath */
export function navigationConfigPath(config: Record<string, unknown>): string {
	return configPath(config, 'navigation_path', DEFAULT_NAVIGATION_PATH);
}
