import { DEFAULT_CATEGORIES_PATH, DEFAULT_NAVIGATION_PATH } from '@/lib/astro-layout/types';
import { DEFAULT_RECENT_CHANGES_PATH } from '@/lib/recent-changes/types';

function configPath(config: Record<string, unknown>, key: string, fallback: string): string {
	const raw = config[key];
	return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
}

export function categoriesConfigPath(config: Record<string, unknown>): string {
	return configPath(config, 'categories_path', DEFAULT_CATEGORIES_PATH);
}

export function navigationConfigPath(config: Record<string, unknown>): string {
	return configPath(config, 'navigation_path', DEFAULT_NAVIGATION_PATH);
}

export function recentChangesConfigPath(config: Record<string, unknown>): string {
	return configPath(config, 'recent_changes_path', DEFAULT_RECENT_CHANGES_PATH);
}
