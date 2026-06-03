export type RecentChangeKind = 'news' | 'page' | 'layout' | 'manual';

export type RecentChangeEntry = {
	title: string;
	href: string;
	kind: RecentChangeKind;
	changedAt: string;
	/** Id wpisu OmniPress — deduplikacja przy aktualizacji */
	sourceId?: string;
};

export type RecentChangesFile = {
	entries: RecentChangeEntry[];
};

export const DEFAULT_RECENT_CHANGES_PATH = 'src/config/omnipress-recent-changes.json';
export const MAX_RECENT_CHANGES = 40;

export function emptyRecentChangesFile(): RecentChangesFile {
	return { entries: [] };
}

export function recentChangesPath(config: Record<string, unknown>): string {
	const raw = config.recent_changes_path;
	return typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_RECENT_CHANGES_PATH;
}
