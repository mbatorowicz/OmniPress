import { layoutConfigPath } from '@/lib/admin/config-paths';
import {
	getGitHubFile,
	getGitHubFileText,
	putGitHubFile,
	type GitHubConfig,
	type GitHubTextFileWrite,
} from '@/lib/publish/github-api';
import { buildLayoutFilePayload, parseLayoutFile } from '@/lib/astro-layout/parse';
import { upsertRecentChangeEntriesInLayout } from '@/lib/astro-layout/migrate-layout';
import { upsertRecentChange } from './upsert';
import type { RecentChangeEntry } from './types';

export async function prepareRecentChangeAppendWrite(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	entry: RecentChangeEntry,
): Promise<GitHubTextFileWrite> {
	const path = layoutConfigPath(destinationConfig);
	const existing = await getGitHubFile(cfg, token, path);
	const text = existing ? await getGitHubFileText(cfg, token, path) : null;

	let layoutPayload;
	try {
		layoutPayload = text
			? parseLayoutFile(text)
			: { categories: [], displays: {}, slots: [] };
	} catch {
		layoutPayload = { categories: [], displays: {}, slots: [] };
	}

	const rcSlot = layoutPayload.slots.find((s) => s.component === 'sidebar.recent_changes');
	const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);
	const slots = layoutPayload.slots.map((slot) =>
		slot.component === 'sidebar.recent_changes' ? { ...slot, entries } : slot,
	);

	const content = buildLayoutFilePayload({
		categories: layoutPayload.categories,
		categoryDisplays: layoutPayload.displays,
		slots,
		navigation: [],
		layoutPath: path,
		navigationPath: '',
		categoriesPath: '',
	});

	return { path, content };
}

export async function appendRecentChangeOnGitHub(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	entry: RecentChangeEntry,
): Promise<void> {
	const prepared = await prepareRecentChangeAppendWrite(cfg, token, destinationConfig, entry);
	const existing = await getGitHubFile(cfg, token, prepared.path);

	await putGitHubFile(
		cfg,
		token,
		prepared.path,
		prepared.content,
		'OmniPress: rejestr ostatnich zmian',
		existing?.sha,
	);
}

export function appendRecentChangeToLayoutText(text: string, entry: RecentChangeEntry): string {
	const parsed = parseLayoutFile(text);
	const rcSlot = parsed.slots.find((s) => s.component === 'sidebar.recent_changes');
	const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);
	const layout = upsertRecentChangeEntriesInLayout(
		{
			categories: parsed.categories,
			categoryDisplays: parsed.displays,
			slots: parsed.slots,
			navigation: [],
			layoutPath: '',
			navigationPath: '',
			categoriesPath: '',
		},
		entries,
	);
	return buildLayoutFilePayload(layout);
}
